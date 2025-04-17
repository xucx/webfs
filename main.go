package main

import (
	"context"
	"mama/config"
	"mama/log"
	"mama/server"
	"os"
	"os/signal"
	"syscall"

	"github.com/spf13/cobra"
)

var (
	configFile = "./config.yml"
	cmd        = &cobra.Command{
		Use: "server",
		RunE: func(cmd *cobra.Command, args []string) error {
			config.Load(configFile)
			log.SetLevel(log.ParseLevel(config.C.LogLevel))
			return server.Run(cmd.Context(), assetsFS)
		},
	}
)

func main() {
	ctx, _ := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	cobra.CheckErr(cmd.ExecuteContext(ctx))
}

func init() {
	cmd.Flags().StringVarP(&configFile, "conf", "c", "./config.yml", "配置文件")
}
