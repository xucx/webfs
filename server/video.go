package server

import (
	"bytes"
	"fmt"
	"os"

	ffmpeg "github.com/u2takey/ffmpeg-go"
)

func vedioSnapshot(path string, frameNum int) ([]byte, error) {
	buf := bytes.NewBuffer(nil)
	err := ffmpeg.Input(path).Filter("select", ffmpeg.Args{fmt.Sprintf("gte(n,%d)", frameNum)}).
		Output("pipe:", ffmpeg.KwArgs{"vframes": 1, "format": "image2", "vcodec": "mjpeg"}).
		WithOutput(buf, os.Stdout).
		Run()
	if err != nil {
		return nil, err
	}

	return buf.Bytes(), nil

}
