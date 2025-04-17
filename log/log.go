package log

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"
)

type Format int8

const (
	ConsoleFormat Format = iota - 1
	JsonFormat
)

var FormatNames = map[Format]string{
	ConsoleFormat: "CONSOLE",
	JsonFormat:    "JSON",
}

func ParseFormat(text string) Format {
	lower := strings.ToUpper(text)
	for format, name := range FormatNames {
		if lower == name {
			return format
		}
	}
	return ConsoleFormat
}

type Level int8

const (
	DebugLevel Level = iota - 1
	InfoLevel
	WarnLevel
	ErrorLevel
	DPanicLevel
	PanicLevel
	FatalLevel
)

var LevelNames = map[Level]string{
	DebugLevel:  "DEBUG",
	InfoLevel:   "INFO",
	WarnLevel:   "WARN",
	ErrorLevel:  "ERROR",
	DPanicLevel: "DPANIC",
	PanicLevel:  "PANIC",
	FatalLevel:  "FATAL",
}

func ParseLevel(text string) Level {
	lower := strings.ToUpper(text)
	for level, name := range LevelNames {
		if lower == name {
			return level
		}
	}

	return InfoLevel
}

type Log struct {
	Development bool
	Prefix      string
	Format      Format
	Level       Level
}

var L = &Log{
	Development: false,
	Prefix:      "",
	Format:      ConsoleFormat,
	Level:       InfoLevel,
}

func SetLevel(level Level)            { L.Level = level }
func Debug(msg string)                { L.Debug(msg) }
func Debugf(format string, a ...any)  { L.Debugf(format, a...) }
func Info(msg string)                 { L.Info(msg) }
func Infof(format string, a ...any)   { L.Infof(format, a...) }
func Warn(msg string)                 { L.Warn(msg) }
func Warnf(format string, a ...any)   { L.Warnf(format, a...) }
func Error(msg string)                { L.Error(msg) }
func Errorf(format string, a ...any)  { L.Errorf(format, a...) }
func DPanic(msg string)               { L.DPanic((msg)) }
func DPanicf(format string, a ...any) { L.DPanicf(format, a...) }
func Panic(msg string)                { L.Panic(msg) }
func Panicf(format string, a ...any)  { L.Panicf(format, a...) }
func Fatal(msg string)                { L.Fatal(msg) }
func Fatalf(format string, a ...any)  { L.Fatalf(format, a...) }

func (l *Log) Write(level Level, msg string) {
	if level >= l.Level {
		fmt.Println(l.format(level, msg))
	}
}

func (l *Log) Debug(msg string)               { l.Write(DebugLevel, msg) }
func (l *Log) Debugf(format string, a ...any) { l.Debug(fmt.Sprintf(format, a...)) }
func (l *Log) Info(msg string)                { l.Write(InfoLevel, msg) }
func (l *Log) Infof(format string, a ...any)  { l.Info(fmt.Sprintf(format, a...)) }
func (l *Log) Warn(msg string)                { l.Write(WarnLevel, msg) }
func (l *Log) Warnf(format string, a ...any)  { l.Warn(fmt.Sprintf(format, a...)) }
func (l *Log) Error(msg string)               { l.Write(ErrorLevel, msg) }
func (l *Log) Errorf(format string, a ...any) { l.Error(fmt.Sprintf(format, a...)) }
func (l *Log) DPanic(msg string) {
	l.Write(DPanicLevel, msg)
	if l.Development {
		panic(msg)
	}
}
func (l *Log) DPanicf(format string, a ...any) { l.DPanic(fmt.Sprintf(format, a...)) }
func (l *Log) Panic(msg string) {
	l.Write(PanicLevel, msg)
	panic(msg)
}
func (l *Log) Panicf(format string, a ...any) { l.Panic(fmt.Sprintf(format, a...)) }
func (l *Log) Fatal(msg string)               { l.Write(FatalLevel, msg) }
func (l *Log) Fatalf(format string, a ...any) { l.Fatal(fmt.Sprintf(format, a...)) }

func (l *Log) WithNewPrefix(prefix string) *Log {
	return &Log{
		Development: l.Development,
		Prefix:      prefix,
		Format:      l.Format,
		Level:       l.Level,
	}
}

type Line struct {
	Time  string `json:"time"`
	Level string `json:"level"`
	Msg   string `json:"msg"`
}

func (l *Log) format(level Level, line string) string {
	if l.Prefix != "" {
		line = fmt.Sprintf("[%s] %s", l.Prefix, line)
	}

	item := Line{
		Time:  time.Now().Format(time.RFC3339Nano),
		Level: LevelNames[level],
		Msg:   line,
	}

	switch l.Format {
	case JsonFormat:
		jsonLine, _ := json.Marshal(&item)
		return string(jsonLine)
	default:
		return fmt.Sprintf("%-35s %-6s %s", item.Time, item.Level, item.Msg)
	}
}
