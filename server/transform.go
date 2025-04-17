package server

import (
	"bytes"
	"crypto/md5"
	"encoding/hex"
	"errors"
	"fmt"
	"image"
	"mama/config"
	"mama/log"
	"math"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"sync"

	"github.com/gabriel-vasile/mimetype"
	"github.com/nao1215/imaging"

	"github.com/labstack/echo/v4"
)

const (
	urlQueryParamKey      = "t"
	urlQueryParamSep      = "|"
	urlQueryParamValueSep = ","

	opResize    = "resize"
	opThumbnail = "thumbnail"
	opSnapshot  = "snapshot"

	defaultQuality = 95
	defaultFormat  = Format("png")
)

type Transform struct {
	cacheDir string
	ops      map[string]*TransformDef
}

type TransformFunc func(*TransformOp, *log.Log) error
type TransformDef struct {
	f           TransformFunc
	canFallback bool
}

func NewTransform(cacheDir string) *Transform {
	os.MkdirAll(cacheDir, os.ModePerm)
	return &Transform{
		cacheDir: cacheDir,
		ops: map[string]*TransformDef{
			opResize:    {f: transformResize, canFallback: true},
			opThumbnail: {f: transformThumbnail, canFallback: true},
			opSnapshot:  {f: transfomrSnapshot, canFallback: false},
		},
	}
}

func transformResize(op *TransformOp, log *log.Log) error {
	log.Infof("start resize with params: w=%d h=%d format=%s quality=%d", op.w, op.h, op.format, op.quality)
	return transformImage(op, log, func(img image.Image) (image.Image, error) {

		//always keep the ratio
		dw := op.w
		dh := op.h
		if dw > 0 && dh > 0 {
			w := img.Bounds().Max.X
			h := img.Bounds().Max.Y
			factor := math.Min(float64(dw)/float64(w), float64(dh)/float64(h))
			dw = int(float64(w) * factor)
			dh = int(float64(h) * factor)
		}

		return imageScale(img, dw, dh, imaging.Resize), nil
	})
}

func transformThumbnail(op *TransformOp, log *log.Log) error {
	log.Infof("start resize with params: w=%d h=%d format=%s quality=%d", op.w, op.h, op.format, op.quality)
	return transformImage(op, log, func(img image.Image) (image.Image, error) {
		return imageScale(img, op.w, op.h, imaging.Thumbnail), nil
	})
}

func transfomrSnapshot(op *TransformOp, log *log.Log) error {
	imgBytes, err := vedioSnapshot(op.file.path, op.framenum)
	if err != nil {
		return err
	}

	img, err := imageDecode(bytes.NewReader(imgBytes))
	if err != nil {
		return err
	}

	result, err := imageToBytes(img, Format(op.format), op.quality)
	if err != nil {
		return err
	}

	op.result = result

	return nil
}

func transformImage(op *TransformOp, log *log.Log, f func(image.Image) (image.Image, error)) error {
	img, err := imageDecodeBytes(op.source)
	if err != nil {
		log.Errorf("decode image fail: %v", err)
		return err
	}

	var resultImg image.Image
	if op.w == 0 && op.h == 0 {
		log.Warn("width and height is zero, return source image")
		resultImg = img
	} else {
		resultImg, err = f(img)
		if err != nil {
			return err
		}
	}

	result, err := imageToBytes(resultImg, Format(op.format), op.quality)
	if err != nil {
		return err
	}

	op.result = result

	return nil
}

type TransformInputFile struct {
	path string
	mu   sync.Mutex

	info os.FileInfo
	file []byte
}

func (f *TransformInputFile) getFileInfo() (os.FileInfo, []byte, error) {
	f.mu.Lock()
	defer f.mu.Unlock()

	if f.info != nil && f.file != nil {
		return f.info, f.file, nil
	}

	var err error

	f.info, err = os.Stat(f.path)
	if err != nil {
		return nil, nil, err
	}

	f.file, err = os.ReadFile(f.path)
	if err != nil {
		return nil, nil, err
	}

	return f.info, f.file, nil
}

type TransformOp struct {
	file   *TransformInputFile
	source []byte
	result []byte

	op       string
	w        int
	h        int
	quality  int
	format   Format
	framenum int
}

type TransformTask struct {
	ctx       echo.Context
	log       *log.Log
	key       string
	cachePath string
	ops       []*TransformOp
	force     bool
	inputFile *TransformInputFile
	result    []byte
}

func (t *Transform) Do(ctx echo.Context, path string) error {
	task := t.getTask(ctx, path)
	if task != nil {
		if !task.force && tryCache(task) == nil {
			task.log.Infof("return cached file %s", task.cachePath)
			return nil
		}

		if err := t.runTask(task); err == nil {
			task.log.Info("task finish ok")
			if err := saveCache(task); err == nil {
				if err := serveFile(task.ctx, task.cachePath); err == nil {
					return nil
				}
			}
		} else {
			task.log.Errorf("task fail: %s", err.Error())
		}
	}

	return fallback(task)

}

func (t *Transform) runTask(task *TransformTask) error {

	var (
		lastOp    *TransformOp
		lastOpErr error
	)

	for _, op := range task.ops {
		if lastOp == nil {
			op.source = task.inputFile.file
		} else {
			op.source = lastOp.result
		}

		opDef := t.ops[op.op]
		if lastOpErr = opDef.f(op, task.log.WithNewPrefix(fmt.Sprintf("transform %s %s", task.inputFile.path, op.op))); lastOpErr != nil {
			break
		}

		task.result = op.result
		lastOp = op
	}

	return nil
}

func (t *Transform) getTask(ctx echo.Context, path string) *TransformTask {
	task := &TransformTask{
		ctx:       ctx,
		log:       log.L.WithNewPrefix("transform " + path),
		inputFile: &TransformInputFile{path: path},
		ops:       []*TransformOp{},
	}

	param := ctx.QueryParam(urlQueryParamKey)
	if param == "" {
		return task
	}

	task.log.Debugf("param is %s", param)

	optStrs := strings.Split(param, urlQueryParamSep)
	if len(optStrs) == 0 {
		return task
	}

	keys := []string{}
	for _, optStr := range optStrs {

		task.log.Debugf("process opt str %s", optStr)
		opt := TransformOp{
			file:    task.inputFile,
			quality: defaultQuality,
		}

		items := strings.Split(optStr, urlQueryParamValueSep)
		for _, item := range items {
			if kv := strings.SplitN(item, "=", 2); len(kv) > 0 {
				k := kv[0]
				v := ""
				if len(kv) > 1 {
					v = kv[1]
				}

				switch k {
				case "op":
					if _, ok := t.ops[v]; ok {
						opt.op = v
					} else {
						break
					}
				case "w":
					if vInt, err := strconv.ParseInt(v, 10, 32); err == nil {
						opt.w = int(vInt)
					}
				case "h":
					if vInt, err := strconv.ParseInt(v, 10, 32); err == nil {
						opt.h = int(vInt)
					}
				case "q":
					if vInt, err := strconv.ParseInt(v, 10, 32); err == nil {
						opt.quality = int(vInt)
					}
				case "fmt":
					//TODO check
					if format, ok := FormatMap[v]; ok {
						opt.format = format
					}
				case "framenum":
					if vInt, err := strconv.ParseInt(v, 10, 32); err == nil {
						opt.framenum = int(vInt)
					}
				case "force":
					task.force = task.force || v != "false"
				}
			}
		}

		if opt.op == "" {
			continue
		}

		if opt.format == "" {
			if _, file, err := task.inputFile.getFileInfo(); err == nil {
				if mtype, err := mimetype.DetectReader(bytes.NewReader(file)); err == nil {
					if format, ok := MimeTypeToFormat[mtype.String()]; ok {
						task.log.Infof("set op %s format to %s by mimetype %s", opt.op, format, mtype.String())
						opt.format = format
					}
				}
			}
		}
		if opt.format == "" {
			task.log.Infof("set op %s format %s by default", opt.op, defaultFormat)
			opt.format = defaultFormat
		}

		if opt.op == opSnapshot {
			if opt.framenum < 1 {
				opt.framenum = 1
			}
		}

		task.log.Infof("add op %s", opt.op)
		task.ops = append(task.ops, &opt)
		keys = append(keys, getOpKey(&opt))
	}

	if len(task.ops) == 0 {
		return nil
	}

	task.key = getKey(path, keys)
	task.cachePath = filepath.Join(t.cacheDir, task.key)

	return task
}

func tryCache(task *TransformTask) error {
	return serveFile(task.ctx, task.cachePath)
}

func saveCache(task *TransformTask) error {
	if task.result == nil || len(task.result) < 1 {
		return errors.New("empty result")
	}

	return os.WriteFile(task.cachePath, task.result, os.ModePerm)
}

func fallback(task *TransformTask) error {
	info, file, err := task.inputFile.getFileInfo()
	if err != nil {
		return err
	}
	http.ServeContent(task.ctx.Response(), task.ctx.Request(), info.Name(), info.ModTime(), bytes.NewReader(file))
	return nil
}

func serveFile(ctx echo.Context, path string) error {
	fileInfo, err := os.Stat(path)
	if err != nil {
		return err
	}

	file, err := os.Open(path)
	if err != nil {
		return err
	}
	defer file.Close()

	http.ServeContent(ctx.Response(), ctx.Request(), fileInfo.Name(), fileInfo.ModTime(), file)

	return nil
}

func getOpKey(op *TransformOp) string {
	intKey := func(v int) string {
		if v != 0 {
			return strconv.Itoa(v)
		}
		return ""
	}
	params := map[string]string{
		"op":       op.op,
		"w":        intKey(op.w),
		"h":        intKey(op.h),
		"quality":  intKey(op.quality),
		"format":   string(op.format),
		"framenum": intKey(op.framenum),
	}

	sortItems := make([]string, 0, len(params))
	for k, v := range params {
		if v != "" {
			sortItems = append(sortItems, k)
		}
	}

	sort.Strings(sortItems)

	for i := range sortItems {
		sortItems[i] = sortItems[i] + "=" + params[sortItems[i]]
	}

	return strings.Join(sortItems, urlQueryParamValueSep)
}

func getKey(path string, keys []string) string {
	name, err := filepath.Rel(config.C.Dir, path)
	if err != nil {
		name = path
	}

	keyStr := fmt.Sprintf("%s?%s=%s", name, urlQueryParamKey, strings.Join(keys, urlQueryParamSep))

	h := md5.New()
	h.Write([]byte(keyStr))
	return hex.EncodeToString(h.Sum(nil))

}
