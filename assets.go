package main

import (
	"embed"
	"net/http"
)

//go:embed assets/*
var assetsFS embed.FS

var Assets = http.FS(assetsFS)
