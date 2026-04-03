---
title: Docker 搭建 Misskey 实例详细教程
author: ymdr
pubDatetime: 2026-04-03
modDatetime: 2026-04-03
slug: Misskey-Build-and-Maintenance
featured: false
draft: false
tags:
  - 教程
description:
  详细介绍如何使用 Docker 搭建 Misskey 实例、过程中遇到的问题应该如何解决、如何清理维护数据库，确保实例正常运行。
---

- [一、Docker 环境安装](#一docker-环境安装)
- [二、Docker Compose 部署 Misskey](#二docker-compose-部署-misskey)
- [三、配置反向代理](#三配置反向代理)
- [四、常见问题解决方案](#四常见问题解决方案)
  - [1.上传图片报错](#1上传图片报错)
  - [2.无法联合问题，即无法与其他实例建立连接](#2无法联合问题即无法与其他实例建立连接)
- [五、清理维护](#五清理维护)
- [六、中继推荐](#六中继推荐)

## 一、Docker 环境安装

采用 Docker 方式部署服务可以做到服务运行环境与宿主机环境相互隔离，配置部署方便快捷，日后也方便一键卸载、备份、管理、迁移等操作，非常契合持续集成与持续部署 (CI/CD) 流程。

Docker 安装部分可以参看[官网教程](https://docs.docker.com/engine/install/debian/#install-using-the-repository)，里面详细介绍了应该如何安装 Docker。

Dcoker 安装方式推荐采用 apt 存储库的方式安装，便于后续更新维护。

Docker Compose 是非常方便的容器管理工具，通常会默认安装。

安装完成后我们需要对 Docker 进行一些配置，参考配置如下：

```json file=/etc/docker/daemon.json
{
    "log-driver": "json-file",
    "log-opts": {
        "max-size": "20m", // 限制日志文件大小，防止塞满硬盘
        "max-file": "3" // 限制文件数
    },
    "ipv6": true, // 设置开启IPv6
    "fixed-cidr-v6": "fd00:dead:beef:c0::/80",
    "experimental":true,
    "ip6tables":true
}
```

本地如果没有配置文件，那就创建一个，然后重启 Docker。

## 二、Docker Compose 部署 Misskey

首先需要创建 Docker Compose 所需的配置文件 misskey-compose.yaml（名字随意）。[官方示例](https://github.com/misskey-dev/misskey/blob/develop/compose_example.yml)

参考示例：

```yaml file=/docker/misskey/misskey-compose.yaml
# Misskey minimal deploy config
services:
  web:
    restart: always # 自动重启，请注意如果您对您的配置没有信心，请不要开启这个选项，以避免进程崩溃反复重启耗费大量资源！
    image: misskey/misskey:latest # 这里使用了官方镜像，以避免本地构建时资源不足的问题
    container_name: misskey_web # 容器名，方便管理，您可以自行修改为您觉得合适的内容
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    ports:
      - "3000:3000" # 端口可自定义
    networks:
      - internal_network
      - external_network
    volumes:
      - ./config:/misskey/.config:ro # 用于映射配置文件，请根据您的实际配置来决定文件夹名称，设定为只读即可
      - ./files:/misskey/files # 用户上传到本地的文件，如果您一开始就接入外部存储（如wasabi或是AWS S3）您可以忽略这块配置

  redis:
    restart: always
    image: redis:7-alpine
    container_name: misskey_redis
    networks:
      - internal_network
    volumes:
      - ./redis:/data # redis数据库的数据文件夹映射，创建后默认在 ./redis 文件夹中
    healthcheck:
      test: "redis-cli ping"
      interval: 5s
      retries: 20

  db:
    restart: always
    image: groonga/pgroonga:latest-alpine-18 # 使用 postgresql 的拓展版本 pgroonga，因为原版数据库对于中文的搜索支持太差了。Misskey 配置文件中也需要修改为 sqlPgroonga
    container_name: misskey_db
    networks:
      - internal_network
    env_file:
      - ./config/docker.env # 需要使用配置文件中设置的 Docker 环境变量
    volumes:
      - ./db:/var/lib/postgresql # 主数据库的数据文件夹映射，创建后默认在 ./db 文件夹中
    healthcheck:
      test: "pg_isready -U $$POSTGRES_USER -d $$POSTGRES_DB"
      interval: 5s
      retries: 20

networks:
  internal_network: # 内部网络
    internal: true
  external_network: # 外部网
```

接着创建 Docker 环境文件，主要是数据库的用户名、密码、端口。[官方示例](https://github.com/misskey-dev/misskey/blob/develop/.config/docker_example.env)

参考示例：
```txt file=/docker/misskey/config/docker.env
# misskey settings
# MISSKEY_URL=https://example.tld/

# db settings
POSTGRES_PASSWORD=example-misskey-pass
# DATABASE_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_USER=example-misskey-user
# DATABASE_USER=${POSTGRES_USER}
POSTGRES_DB=misskey
# DATABASE_DB=${POSTGRES_DB}
DATABASE_URL="postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}"
```

最后是 Misskey 的配置文件。[官方示例](https://github.com/misskey-dev/misskey/blob/develop/.config/docker_example.yml)

参考示例：

```yaml file=/docker/misskey/config/default.yaml
#━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Misskey configuration
#━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

#   ┌─────┐
#───┘ URL └─────────────────────────────────────────────────────

# Final accessible URL seen by a user.
# You can set url from an environment variable instead.
url: https://example.tld/

# ONCE YOU HAVE STARTED THE INSTANCE, DO NOT CHANGE THE
# URL SETTINGS AFTER THAT!

#   ┌───────────────────────┐
#───┘ Port and TLS settings └───────────────────────────────────

#
# Misskey requires a reverse proxy to support HTTPS connections.
#
#                 +----- https://example.tld/ ------------+
#   +------+      |+-------------+      +----------------+|
#   | User | ---> || Proxy (443) | ---> | Misskey (3000) ||
#   +------+      |+-------------+      +----------------+|
#                 +---------------------------------------+
#
#   You need to set up a reverse proxy. (e.g. nginx)
#   An encrypted connection with HTTPS is highly recommended
#   because tokens may be transferred in GET requests.

# The port that your Misskey server should listen on.
port: 3000

#   ┌──────────────────────────┐
#───┘ PostgreSQL configuration └────────────────────────────────

db:
  host: db
  port: 5432

  # Database name
  # You can set db from an environment variable instead.
  db: misskey

  # Auth
  # You can set user and pass from environment variables instead.
  user: example-misskey-user
  pass: example-misskey-pass

  # Whether disable Caching queries
  #disableCache: true

  # Extra Connection options
  #extra:
  #  ssl: true

dbReplications: false

# You can configure any number of replicas here
#dbSlaves:
#  -
#    host:
#    port:
#    db:
#    user:
#    pass:
#  -
#    host:
#    port:
#    db:
#    user:
#    pass:

#   ┌─────────────────────┐
#───┘ Redis configuration └─────────────────────────────────────

redis:
  host: redis
  port: 6379
  #family: 0  # 0=Both, 4=IPv4, 6=IPv6
  #pass: example-pass
  #prefix: example-prefix
  #db: 1

#redisForPubsub:
#  host: redis
#  port: 6379
#  #family: 0  # 0=Both, 4=IPv4, 6=IPv6
#  #pass: example-pass
#  #prefix: example-prefix
#  #db: 1

#redisForJobQueue:
#  host: redis
#  port: 6379
#  #family: 0  # 0=Both, 4=IPv4, 6=IPv6
#  #pass: example-pass
#  #prefix: example-prefix
#  #db: 1

#redisForTimelines:
#  host: redis
#  port: 6379
#  #family: 0  # 0=Both, 4=IPv4, 6=IPv6
#  #pass: example-pass
#  #prefix: example-prefix
#  #db: 1

#redisForReactions:
#  host: redis
#  port: 6379
#  #family: 0  # 0=Both, 4=IPv4, 6=IPv6
#  #pass: example-pass
#  #prefix: example-prefix
#  #db: 1

#   ┌───────────────────────────────┐
#───┘ Fulltext search configuration └─────────────────────────────

# These are the setting items for the full-text search provider.
fulltextSearch:
  # You can select the ID generation method.
  # - sqlLike (default)
  #   Use SQL-like search.
  #   This is a standard feature of PostgreSQL, so no special extensions are required.
  # - sqlPgroonga
  #   Use pgroonga.
  #   You need to install pgroonga and configure it as a PostgreSQL extension.
  #   In addition to the above, you need to create a pgroonga index on the text column of the note table.
  #   see: https://pgroonga.github.io/tutorial/
  # - meilisearch
  #   Use Meilisearch.
  #   You need to install Meilisearch and configure.
  provider: sqlPgroonga

# For Meilisearch settings.
# If you select "meilisearch" for "fulltextSearch.provider", it must be set.
# You can set scope to local (default value) or global
# (include notes from remote).

#meilisearch:
#  host: meilisearch
#  port: 7700
#  apiKey: ''
#  ssl: true
#  index: ''
#  scope: local

#   ┌───────────────┐
#───┘ ID generation └───────────────────────────────────────────

# You can select the ID generation method.
# You don't usually need to change this setting, but you can
# change it according to your preferences.

# Available methods:
# aid ... Short, Millisecond accuracy
# aidx ... Millisecond accuracy
# meid ... Similar to ObjectID, Millisecond accuracy
# ulid ... Millisecond accuracy
# objectid ... This is left for backward compatibility

# ONCE YOU HAVE STARTED THE INSTANCE, DO NOT CHANGE THE
# ID SETTINGS AFTER THAT!

id: 'aidx'

#   ┌────────────────┐
#───┘ Error tracking └──────────────────────────────────────────

# Sentry is available for error tracking.
# See the Sentry documentation for more details on options.

#sentryForBackend:
#  enableNodeProfiling: true
#  options:
#    dsn: 'https://examplePublicKey@o0.ingest.sentry.io/0'

#sentryForFrontend:
#  vueIntegration:
#    tracingOptions:
#      trackComponents: true
#  browserTracingIntegration:
#  replayIntegration:
#  options:
#    dsn: 'https://examplePublicKey@o0.ingest.sentry.io/0'

#   ┌─────────────────────┐
#───┘ Other configuration └─────────────────────────────────────

# Whether disable HSTS
#disableHsts: true

# Number of worker processes
#clusterLimit: 1

# Job concurrency per worker
# deliverJobConcurrency: 128
# inboxJobConcurrency: 16

# Job rate limiter
# deliverJobPerSec: 128
# inboxJobPerSec: 32

# Job attempts
# deliverJobMaxAttempts: 12
# inboxJobMaxAttempts: 8

# IP address family used for outgoing request (ipv4, ipv6 or dual)
#outgoingAddressFamily: ipv4

# Proxy for HTTP/HTTPS
#proxy: http://127.0.0.1:3128

proxyBypassHosts:
  - api.deepl.com
  - api-free.deepl.com
  - www.recaptcha.net
  - hcaptcha.com
  - challenges.cloudflare.com

# Proxy for SMTP/SMTPS
#proxySmtp: http://127.0.0.1:3128   # use HTTP/1.1 CONNECT
#proxySmtp: socks4://127.0.0.1:1080 # use SOCKS4
#proxySmtp: socks5://127.0.0.1:1080 # use SOCKS5

# Media Proxy
#mediaProxy: https://example.com/proxy

# For security reasons, uploading attachments from the intranet is prohibited,
# but exceptions can be made from the following settings. Default value is "undefined".
# Read changelog to learn more (Improvements of 12.90.0 (2021/09/04)).
#allowedPrivateNetworks: [
#  '127.0.0.1/32'
#]

# Upload or download file size limits (bytes)
#maxFileSize: 262144000

# Log settings
# logging:
#   sql:
#     # Outputs query parameters during SQL execution to the log.
#     # default: false
#     enableQueryParamLogging: false
#     # Disable query truncation. If set to true, the full text of the query will be output to the log.
#     # default: false
#     disableQueryTruncation: false
```

需要注意的是，Misskey 实例的域名一旦确定，后续就最好不要更改，因为这会影响你的实例与其他实例间的通信。

创建完配置文件后，使用 `cd` 命令进入 Docker Compose 配置文件所在目录，并使用 docker compose 命令启动容器。

```shell
cd /docker/misskey
docker compose up -d
```

如果成功运行，那么就可以通过 http://服务器IP:3000 来访问了。

## 三、配置反向代理

这一步需要安装 Nginx 或者 Caddy 来实现。

这两者主要区别在于 Caddy 可以自动续期域名证书，配置文件简单；Nginx 在高并发（如上万请求）场景下性能表现更优秀。

这里采用 Nginx 实现反向代理（只是因为我比较熟悉而已）。

运行以下命令下载 nginx 以配置反代。

```bash
apt install nginx
```

>如果 vps 安装了防火墙，记得开启 80 和 443 端口。参考命令如下：
>
>```bash
>ufw allow 'Nginx HTTP'
>ufw allow 'Nginx HTTPS'
>```

安装完成后先手动启动。

```bash
systemctl start nginx
```

然后查看 nginx 服务状态

```bash
systemctl status nginx
```

看到`active (running)`则表示成功运行 nginx

安装 certbot 以便申请证书

```bash
# 普通安装
sudo apt install certbot python3-certbot-nginx

# 推荐用 snap 安装
sudo apt install snapd
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot
```

运行 certbot 申请证书

```bash
sudo certbot certonly --nginx
```

记下证书文件的存放位置。

进入 nginx 文件夹创建并编辑 nginx 配置文件

```bash
nano /etc/nginx/conf.d/misskey.conf
```

示例配置如下：

```bash file=/etc/nginx/conf.d/misskey.conf
# For WebSocket
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

proxy_cache_path /tmp/nginx_cache levels=1:2 keys_zone=cache1:16m max_size=1g inactive=720m use_temp_path=off;

server {
    listen 80;
    listen [::]:80;
    server_name example.tld;

    # For SSL domain validation
    root /var/www/html;
    location /.well-known/acme-challenge/ { allow all; }
    location /.well-known/pki-validation/ { allow all; }
    location / { return 301 https://$server_name$request_uri; }
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name example.tld;

    ssl_session_timeout 1d;
    ssl_session_cache shared:ssl_session_cache:10m;
    ssl_session_tickets off;

    # To use Let's Encrypt certificate
    ssl_certificate     /etc/letsencrypt/live/example.tld/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.tld/privkey.pem;

    # To use Debian/Ubuntu's self-signed certificate (For testing or before issuing a certificate)
    #ssl_certificate     /etc/ssl/certs/ssl-cert-snakeoil.pem;
    #ssl_certificate_key /etc/ssl/private/ssl-cert-snakeoil.key;

    # SSL protocol settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_stapling on;
    ssl_stapling_verify on;

    # Change to your upload limit
    client_max_body_size 80m;

    # Proxy to Node
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_http_version 1.1;
        proxy_redirect off;

        # If it's behind another reverse proxy or CDN, remove the following.
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;

        # For WebSocket
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;

        # Cache settings
        proxy_cache cache1;
        proxy_cache_lock on;
        proxy_cache_use_stale updating;
        proxy_force_ranges on;
        add_header X-Cache $upstream_cache_status;
    }
}
```

到这里 Misskey 实例就基本部署完成了。

## 四、常见问题解决方案

### 1.上传图片报错

这是文件夹权限问题导致的，需要在 Misskey 所在目录下运行 `sudo chown -R 991:991 files`

### 2.无法联合问题，即无法与其他实例建立连接

进入容器内部尝试与其他实例连接出现报错 `curl: (77) error setting certificate file: /etc/ssl/certs/ca-certificates.crt`，关键是缺少了证书包，无法进行 SSL 连接。

解决办法是在 Misskey 的 Docker Compose 配置文件中加入：

```yaml file=/docker/misskey/misskey-compose.yaml
# Misskey minimal deploy config
services:
  web:
    restart: always
    image: misskey/misskey:latest
    container_name: misskey_web
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    ports:
      - "3000:3000"
    networks:
      - internal_network
      - external_network
    volumes:
      - ./config:/misskey/.config:ro
      - ./files:/misskey/files
    /* [!code ++:13] */
    user: root  # 1. 强制以 root 身份启动，获得权限
    command: >  # 2. 覆盖默认启动命令，执行我们的修复脚本
      bash -c "
      # 3. 检查证书包是否已安装
        if ! dpkg -l | grep -q ca-certificates; then
          echo '>>>> Certificate package not found. Installing now...'
        # 4. 如果未安装，就以 root 权限进行安装
          apt-get update && apt-get install -y ca-certificates
        fi &&
        echo '>>>> Starting Misskey as user misskey...' &&
      # 5. 修复完成后，切换回低权限的 misskey 用户，再安全地启动程序
        su misskey -c 'pnpm run migrateandstart'
      "
  redis:
    restart: always
    image: redis:7-alpine
    container_name: misskey_redis
    networks:
      - internal_network
    volumes:
      - ./redis:/data
    healthcheck:
      test: "redis-cli ping"
      interval: 5s
      retries: 20

  db:
    restart: always
    image: groonga/pgroonga:latest-alpine-18
    container_name: misskey_db
    networks:
      - internal_network
    env_file:
      - ./config/docker.env
    volumes:
      - ./db:/var/lib/postgresql
    healthcheck:
      test: "pg_isready -U $$POSTGRES_USER -d $$POSTGRES_DB"
      interval: 5s
      retries: 20

networks:
  internal_network:
    internal: true
  external_network:
```

然后运行 `docker compose down && docker compose up -d` 重新启动容器即可。

## 五、清理维护

更新 Misskey 也很简单。

首先进入 Misskey 的 Docker 配置文件目录下，运行

```shell
# 拉取新镜像
docker compose pull

# 重启容器
docker compose up -d

# 一切正常后删除旧镜像以释放空间
docker image prune -f
```

随着联合时间增长，清理数据库就十分有必要了。

首先停止 Misskey 服务（以下命令默认在 docker 所在目录下执行）

```shell
docker compose down
```

进入数据库容器

```shell
# 语法: docker-compose exec <数据库服务名> psql -U <用户名> -d <数据库名> -c "<SQL命令>"
docker compose exec db psql -U example-misskey-user -d misskey
```

接下来是删除远程实例数据

```shell
# 通过 uri 判断是否为远程
DELETE FROM drive_file WHERE "uri" IS NOT NULL;
# 1. 先清理掉那些被置顶的远程笔记关联
DELETE FROM user_note_pining WHERE "noteId" IN (SELECT id FROM note WHERE "uri" IS NOT NULL);
# 2. 清理远程笔记
DELETE FROM note WHERE "uri" IS NOT NULL;

# 删除标签
DELETE FROM hashtag;
# 删除远程表情
DELETE FROM emoji WHERE "host" IS NOT NULL;

# 清理了哪些字段就重建哪些
VACUUM FULL note;
VACUUM FULL drive_file;
VACUUM FULL user_note_pining;
VACUUM FULL hashtag;
VACUUM FULL emoji;
# 也可直接全部重建
VACUUM FULL;

# 退出命令
\q

# ---- 以下是可选项 ----

# 单独重建索引
# 假设索引名称包含 pgroonga 字样，可以通过 \d note 查看具体名称
REINDEX INDEX index_notes_on_text_pgroonga; 

# 这是一个 PGroonga 专用函数，用于优化索引并尝试收缩
SELECT pgroonga_vacuum('index_notes_on_text_pgroonga');

# 可以使用以下命令来搜索包含了 note 字段的表名
\dt *note*
```

数据库中的 `user / user_profile / user_publickey` 不建议删除。这些表存储的是你实例已知的用户信息（包括本地用户和远程关注/被关注的用户）。

只要你的用户关注了外站的人，或者外站人发的消息传到了你的实例，他们的资料和公钥就会被记录，以便验签和展示头像。

## 六、中继推荐

使用中继可以同步其他实例上的消息，丰富实例内容。不过接入太多会对实例造成比较大的负担。

`https://relay.nya.one/inbox` 这是一个中文社区的中继；

`https://relay.fedibird.com/inbox` 这主要是日本社区的中继；

`https://relay.intahnet.co.uk/inbox` 这是英文社区的中继。
