package server

import (
	"bytes"
	"image"
	"image/gif"
	"image/jpeg"
	"image/png"
	"io"
	"math"

	"github.com/nao1215/imaging"
	"github.com/rwcarlsen/goexif/exif"
	"golang.org/x/image/bmp"
	"golang.org/x/image/tiff"

	_ "golang.org/x/image/webp"
)

type Format string

// Image file formats.
const (
	JPEG Format = "jpeg"
	PNG  Format = "png"
	GIF  Format = "gif"
	TIFF Format = "tiff"
	BMP  Format = "bmp"
	WEBP Format = "webp"
)

var (
	FormatMap = map[string]Format{
		"jpeg": JPEG,
		"jpg":  JPEG,
		"png":  PNG,
		"gif":  GIF,
		"tiff": TIFF,
		"bmp":  BMP,
		"webp": WEBP,
	}
	MimeTypeToFormat = map[string]Format{
		"image/bmp":  BMP,
		"image/gif":  GIF,
		"image/jpeg": JPEG,
		"image/jpg":  JPEG,
		"image/png":  PNG,
		"image/webp": WEBP,
	}
)

type (
	transformation func(img image.Image, width int, height int, filter imaging.ResampleFilter) *image.NRGBA
)

func imageDecode(reader io.ReadSeeker) (image.Image, error) {
	img, err := imaging.Decode(reader)
	if err != nil {
		return nil, err
	}

	if _, err = reader.Seek(0, io.SeekStart); err != nil {
		return nil, err
	}
	orientation := imageOrientation(reader)
	switch orientation {
	case "1":
		return img, nil
	case "2":
		return imaging.FlipV(img), nil
	case "3":
		return imaging.Rotate180(img), nil
	case "4":
		return imaging.Rotate180(imaging.FlipV(img)), nil
	case "5":
		return imaging.Rotate270(imaging.FlipV(img)), nil
	case "6":
		return imaging.Rotate270(img), nil
	case "7":
		return imaging.Rotate90(imaging.FlipV(img)), nil
	case "8":
		return imaging.Rotate90(img), nil
	default:
		return img, nil
	}

}

func imageOrientation(reader io.Reader) string {
	x, err := exif.Decode(reader)
	if err != nil {
		return "1"
	}
	if x != nil {
		orient, err := x.Get(exif.Orientation)
		if err != nil {
			return "1"
		}
		if orient != nil {
			return orient.String()
		}
	}

	return "1"
}

func imageDecodeBytes(data []byte) (image.Image, error) {
	return imageDecode(bytes.NewReader(data))
}
func imageEncode(w io.Writer, img image.Image, format Format, quality int) error {
	var err error
	switch format {
	case JPEG:
		var rgba *image.RGBA
		if nrgba, ok := img.(*image.NRGBA); ok {
			if nrgba.Opaque() {
				rgba = &image.RGBA{
					Pix:    nrgba.Pix,
					Stride: nrgba.Stride,
					Rect:   nrgba.Rect,
				}
			}
		}
		if rgba != nil {
			err = jpeg.Encode(w, rgba, &jpeg.Options{Quality: quality})
		} else {
			err = jpeg.Encode(w, img, &jpeg.Options{Quality: quality})
		}

	case PNG:
		err = png.Encode(w, img)
	case GIF:
		err = gif.Encode(w, img, &gif.Options{NumColors: 256})
	case TIFF:
		err = tiff.Encode(w, img, &tiff.Options{Compression: tiff.Deflate, Predictor: true})
	case BMP:
		err = bmp.Encode(w, img)
	// case imagefile.WEBP:
	// 	err = webp.Encode(w, img, &webp.Options{Quality: float32(quality)})
	default:
		err = imaging.ErrUnsupportedFormat
	}
	return err
}

func scalingFactor(srcWidth int, srcHeight int, destWidth int, destHeight int) float64 {
	return math.Max(float64(destWidth)/float64(srcWidth), float64(destHeight)/float64(srcHeight))
}

func imageScalingFactor(img image.Image, dstWidth int, dstHeight int) float64 {
	width, height := imageSize(img)

	return scalingFactor(width, height, dstWidth, dstHeight)
}

func imageSize(img image.Image) (int, int) {
	return img.Bounds().Max.X, img.Bounds().Max.Y
}

func imageToBytes(img image.Image, format Format, quality int) ([]byte, error) {
	var buf bytes.Buffer

	if err := imageEncode(&buf, img, format, quality); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

func imageScale(img image.Image, width int, height int, trans transformation) image.Image {
	factor := imageScalingFactor(img, width, height)

	if factor < 1 {
		return trans(img, width, height, imaging.Lanczos)
	}

	return img
}
