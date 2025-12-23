---
title: 酒馆云端部署
author: ymdr
pubDatetime: 2025-12-19
modDatetime: 2025-12-19
slug: SillyTavern-build
featured: false
draft: false
tags:
  - 教程
  - AI
description:
  在vps上部署酒馆，实现网页浏览的基础教程
---

<!-- omit from toc -->
## 目录

- [一、运行环境配置](#一运行环境配置)
- [二、部署并配置酒馆](#二部署并配置酒馆)
  - [1.部署部分](#1部署部分)
  - [2.配置部分](#2配置部分)
  - [3.测试部分](#3测试部分)
- [三、反代和后台运行设置](#三反代和后台运行设置)
  - [1.安装并运行 nginx](#1安装并运行-nginx)
  - [3.申请 SSL 证书](#3申请-ssl-证书)
  - [4.配置反代](#4配置反代)
  - [5.设置后台运行和开机自启](#5设置后台运行和开机自启)


## 一、运行环境配置

有关于连接 vps 和配置登录文件等等这里不做讲解，不会请自行搜索相关教程。事先说明，各版本的相关命令可能有差别，这里以 Debian 系统为例。此教程参考了类脑知识库的文章，完善了部分内容。

酒馆安装和更新优先使用 Git 工具，所以通过运行以下命令安装 Git

```bash
apt install git
```

然后运行`git -v`验证是否安装成功，安装成功时会返回 Git 的版本信息。纯 IPv6 vps 连接不上 github 建议使用 warp 脚本（如下）或者设置 DNS64 解锁。

```bash
wget -N https://gitlab.com/fscarmen/warp/-/raw/main/warp-go.sh && bash warp-go.sh [option] [lisence]
```

接下来安装 Node.js，具体安装教程看[官网](https://nodejs.org/zh-cn/download)足以。

安装完成后运行环境就配置完成了。

## 二、部署并配置酒馆

### 1.部署部分

酒馆安装只需要使用 Git 克隆仓库，可以自行选择 Release 版和 Staging 版其中一个版本，更多详细信息看[官网](https://sillytavern.wiki/#分支/)。

Release版：
```bash
git clone https://github.com/SillyTavern/SillyTavern -b release
```

Staging版：
```bash
git clone https://github.com/SillyTavern/SillyTavern -b staging
```

克隆后可以使用`ls`命令查验, 确保 SillyTavern 文件夹存在。然后使用`cd 文件路径`命令进入 SillyTavern 文件夹，再次使用`ls`查验内部文件是否存在。（此步骤可以跳过，使用的专业 ssh 连接工具基本都具备查看系统文件的功能，可以使用该功能查看，更直观）

```bash
cd SillyTavern
```

在 SillyTavern 文件夹内（使用`cd`命令进入），运行以下命令即可运行酒馆。

```bash
bash start.sh
```

如果输出以下内容则说明安装成功。

```bash
=================================================

Go to: http://127.0.0.1:8000/ to open SillyTavern

=================================================
```

接下来，使用 Crtl + C 退出运行，开始配置酒馆的相关设置。

### 2.配置部分

同样在 SillyTavern 文件夹内，使用

```bash
nano config.yaml
```

进行编辑, 编辑完成后使用 Ctrl + O 保存并使用 Ctrl + X 关闭 nano。

配置文件主要注意以下条目：

>listen 控制酒馆是否监听远程连接, 默认为 false 时, 酒馆只会监听来自运行它的计算机的连接(localhost), 由于我们在使用远程的云服务器, 所以这项必须设置为 true, 来让我们自己的电脑/手机向服务器发起的连接可以正确的被服务器上的酒馆监听响应
>
>```bash
>listen: false  <<== 默认为 `false`, 应修改为 `true`
>```

>port 控制的是酒馆的访问端口，可以随意在 10000~65535 之间取值，可以选择修改。要注意选取未被占用且开放的端口。
>
>```bash
>port: 8000  <<==可改，可不改
>```

>whitelistMode 设置的是是否要启用白名单模式, 设为 true 意味着仅允许来自白名单列表内的ip连接酒馆。对于大部分人来说，自己的公网IP并非一成不变，所以最好设置为 false。但部分人会选择搭建前置代理，这时如果前置代理的IP固定，则可以设为 true，更加安全。
>
>```bash
>whitelistMode: true  <<== 默认为`true`, 视情况设为 `true` 或 `false`
>```

>whitelist 是白名单，指能访问酒馆服务的 IP。如果 whitelistMode 设为了 false, 这一项便是无意义的, 如果设为了 true 则仿照格式添加自己的公网 ip。
>
>```bash
>whitelist:
>  - ::1
>  - 127.0.0.1
>```

>basicAuthMode 即酒馆页面进入时的登录设置, 设为 true 时, 在进入酒馆页面的时候需要输入登录用户名与密码，设为 false 会直接进入主界面。为避免隐私泄露，推荐开启。
>
>```bash
>basicAuthMode: false  <<== 默认为 `false`, 推荐改为 `true`
>```

>basicAuthUser 即登录的用户名和密码。如果 basicAuthMode 设为了 false, 这一项便是无意义的。启用 basicAuthMode 后, 记得设置一个好记住且复杂的密码。**不要删除引号！**
>
>```bash
>basicAuthUser:  
>  username: ""
>  password: ""
>```

其他配置选项可根据自己意愿更改，但最好了解清楚每一个选项分别具有怎样的功能后再进行更改。

### 3.测试部分

在 SillyTavern 文件夹内，运行以下命令即可运行酒馆。

```bash
bash start.sh
```

然后在浏览器地址栏输入 vps 的 IP:端口号 即可访问，形似：`111.111.111.111:8000`，`[2000:aaaa::0]:8000`

## 三、反代和后台运行设置

经过以上步骤后已经可以正常使用，但IP加端口的访问方式不好记还有可能会导致数据泄露，所以可以进行反代配置。

首先需要 DNS 平台的账号和自己的域名，在 DNS 平台上将域名解析到 vps 的 IP 地址。现在已经支持 IP 证书，或许可以不需要这一步，但在这里依旧按照以前来。

### 1.安装并运行 nginx

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

### 3.申请 SSL 证书

接下来开始申请 SSL 证书。

这里可以使用 cloudflare 的免费证书，有效期长达 15 年，但只能对 cloudflare 和 vps 间的流量加密。

如果之前曾经安装过 certbot 相关的包，需要移除

```bash
apt-get remove certbot
```

安装 certbot

```bash
sudo apt install certbot python3-certbot-nginx
```

运行 certbot 申请证书

```bash
sudo certbot certonly --nginx
```

记下证书文件的存放位置。

### 4.配置反代

进入 nginx 文件夹并编辑 nginx 配置文件

```bash
nano /etc/nginx/nginx.conf
```

示例配置如下：

```bash
server {
listen 443 ssl;
server_name 你的域名;

ssl_certificate      填写证书路径，fullchain.pem;
ssl_certificate_key 填写证书密钥路径，privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8000;   # 转发到本地服务，注意酒馆服务端口
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;         # 保留原始域名
        proxy_set_header X-Real-IP $remote_addr;  # 传递客户端真实IP
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 50M;   # 设置上传文件最大大小，这是必须加上的，大小可自定义
    }
}

server {
    listen 80;
    server_name 你的域名;
    return 301 https://$host$request_uri;
}
```

### 5.设置后台运行和开机自启

以 root 权限在 /etc/systemd/system/ 目录下创建一个名为 sillytavern.service 的文件

```bash
nano /etc/systemd/system/sillytavern.service
```

填写示例配置

```bash
[Unit]
Description=SillyTavern backend service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/SillyTavern
ExecStart=/bin/bash -lc 'NODE_ENV=production node server.js'
Restart=always
RestartSec=10
Environment=PATH=/root/.nvm/versions/node/v22.18.0/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

[Install]
WantedBy=multi-user.target
```

务必确认 WorkingDirectory 路径和 Environment 中的 Node.js 路径在你的机器上是完全一致的，根据酒馆的具体目录而定。

编辑完成后使用 Ctrl + O 保存并使用 Ctrl + X 关闭 nano，重载 systemd 管理程序

```bash
systemctl daemon-reload
```

启动服务

```bash
systemctl start sillytavern
```

设置开机自启

```bash
systemctl enable sillytavern
```

查看运行日志，有助于排查错误

```bash
journalctl -u sillytavern -f
```

到这里就完全成功了，如果你之后升级了 Node.js（通过 NVM），记得更新 Environment 中的路径，否则服务可能会因为找不到 Node 程序的旧版本而启动失败。
