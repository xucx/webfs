package server

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"mama/config"
	"math/rand/v2"
	"net/http"
	"net/url"
	"os"
	"path"
	"path/filepath"
	"sort"
	"strconv"
	"strings"

	"github.com/gabriel-vasile/mimetype"
	"github.com/labstack/echo/v4"
)

type HTTPFileInfo struct {
	Name     string `json:"name"`
	FileName string `json:"fileName"`
	FileExt  string `json:"fileExt"`
	Path     string `json:"path"`
	IsDir    bool   `json:"isDir"`
	MimeType string `json:"mimeType"`
	Size     int64  `json:"size"`
	ModTime  int64  `json:"mtime"`

	//we return frontend config with
	Frontend *config.Frontend `json:"frontend"`

	Dirs  []*HTTPFileInfo `json:"dirs"`
	Files []*HTTPFileInfo `json:"files"`
}

func (s *Server) ReadFile(e echo.Context) error {
	params := e.QueryParams()
	isGetInfo := false
	if _, ok := params["info"]; ok {
		isGetInfo = true
	}

	pathParam, _ := url.QueryUnescape(e.Param("*"))
	path := s.getFilePath(pathParam)

	fi, err := os.Stat(path)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return e.String(404, "file not found")
		}
		return err
	}

	if isGetInfo {
		info := s.convertFileInfo(path, fi)
		if fi.IsDir() {
			files, err := os.ReadDir(path)
			if err != nil {
				return err
			}

			for _, f := range files {
				subPath := filepath.Join(path, f.Name())
				subFi, err := f.Info()
				if err != nil {
					return err
				}
				subInfo := s.convertFileInfo(subPath, subFi)
				if subInfo.IsDir {
					if subInfo.Path != s.cacheDir { //skip cache dir
						info.Dirs = append(info.Dirs, subInfo)
					}
				} else {
					info.Files = append(info.Files, subInfo)
				}
			}

			sort.Slice(info.Dirs, func(i int, j int) bool {
				return info.Dirs[i].Name < info.Dirs[j].Name
			})
			sort.Slice(info.Files, func(i int, j int) bool {
				return info.Files[i].ModTime < info.Files[j].ModTime
			})
		}
		return e.JSON(http.StatusOK, &info)
	}

	if fi.IsDir() {
		return e.Redirect(http.StatusTemporaryRedirect, "/"+pathParam)
	}

	// return file with transform
	return s.transform.Do(e, path)
}

func (s *Server) WriteFile(e echo.Context) error {
	pathParam, _ := url.QueryUnescape(e.Param("*"))
	fpath := s.getFilePath(pathParam)

	// Create dir if not exists
	if _, err := os.Stat(fpath); os.IsNotExist(err) {
		if err := os.MkdirAll(fpath, os.ModePerm); err != nil {
			return e.String(http.StatusInternalServerError, "Error creating directory: "+err.Error())
		}
	}

	file, _ := e.FormFile("file")
	if file == nil {
		//only create dir
		return e.String(http.StatusOK, "Success")
	}

	srcFile, err := file.Open()
	if err != nil {
		return e.String(http.StatusInternalServerError, "Error")
	}
	defer srcFile.Close()

	fname := e.FormValue("filename")
	if fname == "" {
		fname = file.Filename // Use original filename if not provided
	}
	if err := checkFileName(fname); err != nil {
		return e.String(http.StatusBadRequest, "Error")
	}

	dstPath := filepath.Join(fpath, fname)
	dstFile, err := os.Create(dstPath)
	if err != nil {
		return e.String(http.StatusInternalServerError, "Error")
	}

	hasher := sha256.New()
	writer := io.MultiWriter(dstFile, hasher)

	// Use a buffer for efficient copying
	buf := s.bufPool.Get().([]byte)
	defer s.bufPool.Put(buf)

	if _, err := io.CopyBuffer(writer, srcFile, buf); err != nil {
		os.Remove(dstPath)
		return e.String(http.StatusInternalServerError, "Error")
	}

	dstFile.Close()

	hash := hex.EncodeToString(hasher.Sum(nil))
	hashFileName := setHashFileName(fname, hash)

	os.Rename(dstPath, filepath.Join(fpath, hashFileName))

	return e.String(http.StatusOK, "Success")
}

func (s *Server) DeleteFile(e echo.Context) error {
	pathParam, _ := url.QueryUnescape(e.Param("*"))
	fpath := s.getFilePath(pathParam)
	err := os.RemoveAll(fpath)
	if err != nil {
		return err
	}

	return e.String(http.StatusOK, "Success")
}

func (s *Server) getFilePath(fpath string) string {
	path := path.Join(config.C.Dir, path.Clean("/"+fpath))
	return filepath.ToSlash(path)
}

func (s *Server) getFileRelPath(fpath string) string {
	p, _ := filepath.Rel(config.C.Dir, fpath)
	return p
}

func (s *Server) convertFileInfo(path string, fi fs.FileInfo) *HTTPFileInfo {
	info := HTTPFileInfo{
		Name:     fi.Name(),
		FileName: fi.Name(),
		Path:     s.getFileRelPath(path),
		IsDir:    fi.IsDir(),
		Dirs:     []*HTTPFileInfo{},
		Files:    []*HTTPFileInfo{},

		Frontend: config.C.Frontend,
	}

	if info.IsDir {
		if info.Path == "." { //Root dir
			info.Name = APP_NAME
			info.FileName = APP_NAME
			info.Path = ""
		}
	} else {
		info.FileExt = filepath.Ext(info.Name)
		info.Name = getHashFileName(info.Name)
		info.ModTime = fi.ModTime().Unix()
		info.Size = fi.Size()
		info.MimeType = s.getFileMimeType(path, info.ModTime)
	}

	return &info
}

func (s *Server) getFileMimeType(path string, mtime int64) string {
	key := fmt.Sprintf("%s#%d", path, mtime)
	s.mimeTypeMutex.Lock()
	defer s.mimeTypeMutex.Unlock()

	if _, ok := s.mimeTypeCache[key]; !ok {
		if f, err := os.Open(path); err == nil {
			defer f.Close()
			if mtype, err := mimetype.DetectReader(f); err == nil {
				s.mimeTypeCache[key] = mtype.String()
			}
		}
	}

	return s.mimeTypeCache[key]
}

func checkFileName(fname string) error {
	if strings.ContainsAny(fname, "\\/:*<>|") {
		return errors.New("name should not contains \\/:*<>|")
	}
	return nil
}

func setHashFileName(fname string, hash string) string {
	short := hash[:FILE_HASH_STR_LEN]
	maxIndex := 10
	if len(short) < 10 {
		maxIndex = len(short)
	}
	index := rand.IntN(maxIndex)
	short = fmt.Sprintf("%d%s%s%s", index, short[:index], FILE_HASH_STR_SALT, short[index:])

	ext := filepath.Ext(fname)
	name := strings.TrimSuffix(fname, ext)

	return fmt.Sprintf("%s.%s%s", name, short, ext)
}

func getHashFileName(fname string) string {
	ext := filepath.Ext(fname)
	name := strings.TrimSuffix(fname, ext)
	if name != "" {
		items := strings.Split(name, ".")
		if len(items) > 0 {
			hash := items[len(items)-1]
			if i, err := strconv.ParseInt(hash[:1], 10, 32); err == nil {
				index := int(i)
				if index+1+len(FILE_HASH_STR_SALT) <= len(hash) {
					if hash[index+1:index+1+len(FILE_HASH_STR_SALT)] == FILE_HASH_STR_SALT {
						return strings.TrimSuffix(name, "."+hash)
					}
				}
			}
		}
	}

	return name
}
