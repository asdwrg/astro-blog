---
title: Cloudflare Tunnel客户端部署
author: ymdr
pubDatetime: 2026-01-25
modDatetime: 2026-01-25
slug: CF-Tunnel
featured: false
draft: false
tags:
  - 教程
description:
  着重介绍如何在客户端部署和管理 Cloudflare 隧道
---

<!-- omit from toc -->
## 目录

- [一、CF Tunnel 是什么？](#一cf-tunnel-是什么)
- [二、使用 Cloudflare 官方提供的面板进行安装及管理](#二使用-cloudflare-官方提供的面板进行安装及管理)
- [三、使用 cloudflared 组件进行部署及管理](#三使用-cloudflared-组件进行部署及管理)
  - [3.1安装 cloudflared](#31安装-cloudflared)
  - [3.2 Cloudflare 登录](#32-cloudflare-登录)
  - [3.3 创建 Tunnel](#33-创建-tunnel)
  - [3.4 配置 DNS 记录](#34-配置-dns-记录)
  - [3.5 编写配置文件](#35-编写配置文件)
  - [3.6 配置开机自启动](#36-配置开机自启动)
  - [3.7 配置自动更新](#37-配置自动更新)
  - [3.8 测试](#38-测试)

## 一、CF Tunnel 是什么？

Cloudflare Tunnel 是 Cloudflare 官方提供的一种免费服务，主要功能是：
通过加密隧道连接内网与 Cloudflare 边缘节点，结合自有域名来实现稳定的内网穿透，适合在无公网IP的环境中将搭建的服务安全暴露到公网中。

不过由于 Cloudflare 节点在国内的连通性较差，不能保证最终实现效果。

Cloudflare Tunnel 共有两种方式进行部署，本文主要介绍其在客户端上使用 cloudflared 的完整配置过程，可以结合[官方文档](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/)一起观看。

## 二、使用 Cloudflare 官方提供的面板进行安装及管理

在 [Zero Trust](https://one.dash.cloudflare.com/) 左侧菜单栏中，选择**网络——>连接器——>Cloudflare Tunnel**，再点击**创建隧道**，按照指示一步步进行即可。

这一方式极为简单，不过多赘述，更详细的步骤可查看[官方文档](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/get-started/create-remote-tunnel/)

## 三、使用 cloudflared 组件进行部署及管理

### 3.1安装 cloudflared

以 Debian 系统为例，cloudflared 组件有两种安装方式。

>（1）Ubuntu/Debian 官方源安装

更新软件源并安装依赖

```shell
sudo apt-get update
sudo apt-get install -y wget gnupg lsb-release
```

添加 Cloudflare 的官方密钥和源

```shell
wget -q https://packages.cloudflare.com/cloudflare-main.gpg -O- | sudo tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null

echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://packages.cloudflare.com/ $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/cloudflare.list
```

安装 cloudflared

```shell
sudo apt-get update
sudo apt-get install -y cloudflared
```

验证是否安装成功

```shell
cloudflared --version
```

>（2）二进制安装

通过 GitHub 仓库下载最新文件

```shell
curl -L 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64' -o cloudflared
```

设置可执行权限并移动到系统目录

```shell
chmod +x cloudflared
sudo mv cloudflared /usr/local/bin/
```

同样验证是否安装成功

```shell
cloudflared --version
```

### 3.2 Cloudflare 登录

执行以下命令后会输出一个 URL，在浏览器中打开，登录 Cloudflare 账号并选择要使用的域名进行授权。

```shell
cloudflared tunnel login
```

### 3.3 创建 Tunnel

创建一个隧道，名字可以自定义。

>**“<>”记得删除**，后续不再重复提示。

```shell
cloudflared tunnel create <tunnel-name>
```

创建成功后，会返回一个Tunnel ID，类似于‘f6dbcecf-aaaa-aaaa-aaaa-abababababab’，请复制下来，后面会用上。如果不小心遗漏了，可以运行下面的命令查看。

```shell
ls -la ~/.cloudflared/
```

### 3.4 配置 DNS 记录

修改命令中的 tunnel-name 和 domain 为你创建的隧道的名称和想使用的域名。

```shell
cloudflared tunnel route dns <tunnel-name> <domain>
```

### 3.5 编写配置文件

创建配置目录。

```shell
sudo mkdir -p /etc/cloudflared
```

复制凭证文件到系统目录，要修改 Tunnel-ID

```shell
sudo cp ~/.cloudflared/<Tunnel-ID>.json /etc/cloudflared/
sudo chown root:root /etc/cloudflared/<Tunnel-ID>.json
sudo chmod 400 /etc/cloudflared/<Tunnel-ID>.json
```

配置文件具体内容

```shell
sudo tee /etc/cloudflared/config.yml >/dev/null <<'EOF'
// [!code highlight:2]
tunnel: Tunnel-name
credentials-file: /etc/cloudflared/<Tunnel-ID>.json

ingress:
  # HTTP 服务转发
// [!code highlight:2]
  - hostname: domain
    service: http://localhost:8080
  
  # 兜底规则（必需）
  - service: http_status:404
EOF
```

Tunnel name 填入隧道名字，Tunnel ID 填入隧道的ID，domain 填入想使用的域名。service 修改服务所在的端口，也可以使用 “http://127.0.0.1:8080” 的方式。

验证配置文件是否有错误。

```shell
cloudflared tunnel ingress validate
```

### 3.6 配置开机自启动

创建系统服务并运行，

```shell
cloudflared service install | systemctl start cloudflared
```

### 3.7 配置自动更新

```shell
sudo tee /etc/cron.daily/cloudflared-update >/dev/null <<'EOF'
#!/bin/bash
/usr/local/bin/cloudflared update
systemctl restart cloudflared
EOF
```

设置可执行权限

```shell
sudo chmod +x /etc/cron.daily/cloudflared-update
```

### 3.8 测试

访问刚才配置的域名，如果能正常访问，说明配置成功；或者前往 Cloudflare Zero Trust 控制台查看Tunnel的状态，显示正常则成功。
