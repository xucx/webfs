DIST = $(CURDIR)/dist
EXEC = webfs

SERVER_BUILD_OPTS = -ldflags="-s -w"

.PHONY: default
default: frontend server

.PHONY: frontend
frontend:
	cd frontend && npm install && npm run build

.PHONY: pre_build
pre_build:
	go mod tidy

.PHONY: server_local
server_local: pre_build
	go build -o ${DIST}/${EXEC} ${SERVER_BUILD_OPTS} $(CURDIR)

PLATFORMS := linux/amd64 windows/amd64 darwin/amd64
temp = $(subst /, ,$@)
os = $(word 1, $(temp))
arch = $(word 2, $(temp))
.PHONY: server $(PLATFORMS)
server: pre_build $(PLATFORMS)
$(PLATFORMS): 
	GOOS=$(os) GOARCH=$(arch) go build -o ${DIST}/$(os)-$(arch)/${EXEC} ${SERVER_BUILD_OPTS} $(CURDIR)
	cd ${DIST}/$(os)-$(arch) && rm -rf ${EXEC}-*.tar.gz && tar zcvf ${EXEC}-$(os)-$(arch).tar.gz ${EXEC}


	