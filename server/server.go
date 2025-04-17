package server

import (
	"context"
	"fmt"
	"io/fs"
	"mama/config"
	"net/http"
	"path/filepath"
	"slices"
	"sync"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

type Server struct {
	*echo.Echo
	cacheDir      string
	bufPool       sync.Pool
	mimeTypeCache map[string]string
	mimeTypeMutex sync.Mutex
	transform     *Transform
}

func Run(ctx context.Context, staticFs fs.FS) error {

	server := Server{
		Echo:      echo.New(),
		cacheDir:  CACHE_DIR,
		transform: NewTransform(filepath.Join(config.C.Dir, CACHE_DIR)),
		bufPool: sync.Pool{
			New: func() interface{} { return make([]byte, 32*1024) },
		},
		mimeTypeCache: map[string]string{},
	}

	server.HideBanner = true
	server.Use(middleware.Gzip())
	server.Use(middleware.Logger())
	server.Use(middleware.BasicAuthWithConfig(middleware.BasicAuthConfig{
		Skipper: func(e echo.Context) bool {
			req := e.Request()
			if req.Method == http.MethodGet || req.Method == http.MethodOptions {
				return true
			}
			return false
		},
		Validator: func(user string, passwrod string, e echo.Context) (bool, error) {
			if len(config.C.Users) == 0 {
				return true, nil
			}

			return slices.Contains(config.C.Users, user+":"+passwrod), nil

		},
	}))

	route := server.Group(config.C.BasePath)
	route.GET("/-/*", server.ReadFile)
	route.POST("/-/*", server.WriteFile)
	route.DELETE("/-/*", server.DeleteFile)
	route.Use(middleware.StaticWithConfig(middleware.StaticConfig{
		Filesystem: http.FS(staticFs),
		Root:       "assets",
		HTML5:      true,
	}))

	go func() {
		if err := server.Start(fmt.Sprintf("%s:%d", config.C.Addr, config.C.Port)); err != nil && err != http.ErrServerClosed {
			server.Logger.Fatal("shutting down the server")
		}
	}()

	<-ctx.Done()
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(ctx); err != nil {
		server.Logger.Fatal(err)
	}

	return nil
}
