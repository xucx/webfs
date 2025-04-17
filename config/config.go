package config

import (
	"mama/log"
	"os"

	"gopkg.in/yaml.v2"
)

type Config struct {
	LogLevel string   `yaml:"logLevel" json:"logLevel"`
	Addr     string   `yaml:"addr" json:"addr"`
	Port     int      `yaml:"port" json:"port"`
	Dir      string   `yaml:"dir" json:"dir"`
	Users    []string `yaml:"users" json:"users"`
	BasePath string   `yaml:"basePath" json:"basePath"`
	Welcome  *Welcome `yaml:"welcome" json:"welcome"`
}

type Welcome struct {
	Enable              bool   `yaml:"enable" json:"enable"`
	Header              string `yaml:"header" json:"header"`
	BackgroundImageFile string `yaml:"backgroundImageFile" json:"backgroundImageFile"`
	AvatarImageFile     string `yaml:"avatarImageFile" json:"avatarImageFile"`
	Title               string `yaml:"title" json:"title"`
	SubTitle            string `yaml:"subTitle" json:"subTitle"`
	Introduction        string `yaml:"introduction" json:"introduction"`
	EntryText           string `yaml:"enterText" json:"enterText"`
}

var (
	C = Config{
		Addr: "0.0.0.0",
		Port: 8000,
		Dir:  "./",
	}
)

func Load(file string) {
	if file == "" {
		return
	}

	f, err := os.ReadFile(file)
	if err != nil {
		log.Warnf("read config file %s fail: %v", file, err)
		return
	}

	err = yaml.Unmarshal(f, &C)
	if err != nil {
		log.Warnf("unmarshal yaml config fail: %v", err)
		return
	}

	configBytes, _ := yaml.Marshal(&C)
	log.Infof("run with config:\n%s", string(configBytes))

}
