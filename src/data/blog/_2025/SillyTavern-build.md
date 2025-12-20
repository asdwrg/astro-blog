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


## 一、运行环境配置

有关于连接 vps 和配置登录文件等等这里不做讲解，不会请自行搜索相关教程。事先说明，各版本的相关命令可能有差别，这里以 Debian 系统为例。此教程参考了类脑知识库的文章，完善了部分内容。

酒馆安装和更新优先使用 Git 工具，所以通过运行以下命令安装 Git

```bash
apt install git
```

然后运行`git -v`验证是否安装成功，安装成功时会返回 Git 的版本信息。

接下来安装 Node.js，具体安装教程看[官网](https://nodejs.org/zh-cn/download)足以。

安装完成后运行环境就配置完成了

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

进行编辑, 编辑完成后使用 Ctrl + O 保存并使用 Ctrl + X 关闭nano。

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

首先需要 DNS 平台的账号和自己的域名，在 DNS 平台上将域名解析到 vps 的 IP 地址。

然后再运行以下命令下载 nginx 以配置反代。

```bash
apt install nginx
```

>如果 vps 安装了防火墙，记得开启 80 和 443 端口。参考命令如下：
>
>```bash
>ufw allow 'Nginx HTTP'
>ufw allow 'Nginx HTTPS'
>```

