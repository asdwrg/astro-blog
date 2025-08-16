---
title: Hysteria2搭建教程
author: ymdr
pubDatetime: 2024-10-19
modDatetime: 2025-08-09
slug: Hysteria2-Tutorial
featured: false
draft: false
tags:
  - 教程
  - 协议
description:
  Hysteria2通过魔改的 QUIC 协议，可以极大地改善网络不稳定和掉包的情况。但流量大时易被误认为DDoS攻击从而遭到拦截。此协议对移动用户而言体验不佳。
---

<!-- omit from toc -->
## 目录
- [1.准备](#1准备)
- [2.服务端搭建](#2服务端搭建)
  - [（1）安装脚本](#1安装脚本)
  - [（2）设置Hysteria2为开机自启](#2设置hysteria2为开机自启)
  - [（3）修改服务端配置文件](#3修改服务端配置文件)
  - [（4）启动Hysteria2](#4启动hysteria2)
- [3.客户端配置](#3客户端配置)
- [脚本常用命令合集](#脚本常用命令合集)

Hysteria2通过魔改的 QUIC 协议，可以极大地改善网络不稳定和掉包的情况。但流量大时易被误认为DDoS攻击从而遭到拦截。此协议对部分移动用户而言体验不佳。适合对丢包要求不高的场景，比如游戏加速。

## 1.准备

首先，你需要拥有一台vps，并确保防火墙已设置妥当（能正常访问互联网，并开启80、443、ssh端口和节点端口）。

## 2.服务端搭建

### （1）安装脚本

通过ssh连接到vps，输入下面的指令并运行（建议以root身份运行，可以用`sudo -i`来切换到root），安装Hysteria2 bash脚本。

>[脚本常用命令](#脚本常用命令合集)我会放在文章末尾。

```bash
bash <(curl -fsSL https://get.hy2.sh/)
```

如果显示`curl not found`，请先安装curl，通常安装命令为`apt-get install curl`。上面的sudo命令是一样的，将curl替换为sudo即可。

### （2）设置Hysteria2为开机自启

```bash
systemctl enable hysteria-server.service
```

### （3）修改服务端配置文件

这一步建议先复制到记事本，修改完成后再复制到vps上运行。需要修改的地方已经标注。

```bash
cat << EOF > /etc/hysteria/config.yaml
// [!code highlight]
listen: :28349 #监听端口

# 使用自签证书
tls:
  cert: /etc/hysteria/server.crt
  key: /etc/hysteria/server.key

# 使用CA证书
#acme:
#  domains:
// [!code highlight:2]
#    - a.example.com 
#  email: test@sharklasers.com 

auth:
  type: password
  // [!code highlight]
  password: d78Sj9y
  
masquerade:
  type: proxy
  proxy:
  // [!code highlight]
    url: https://bing.com #伪装网址
    rewriteHost: true
EOF
```

上面配置文件中的监听端口，邮箱，认证密码和伪装网址可以根据你的需要随意更改。

对于证书，这里有两种方式，一种是使用CA证书，另一种是使用自签证书。需要从中选择一种，将另外一种注释掉或者直接删除。

使用CA证书需要确保你的域名已经解析到vps的IP地址，另外 _使用CA证书有可能会因为证书颁发机构的原因导致被限流!_ 不过概率不大。对于没有域名的人或者小白来说，使用自签证书更加方便；

使用自签证书则需要运行以下代码来生成自签证书。

```bash
openssl req -x509 -nodes -newkey ec:<(openssl ecparam -name prime256v1) -keyout /etc/hysteria/server.key -out /etc/hysteria/server.crt -subj "/CN=bing.com" -days 36500 && sudo chown hysteria /etc/hysteria/server.key && sudo chown hysteria /etc/hysteria/server.crt
```

更改完成后复制到vps上运行即可。其中有些数据后续还会用到，最好不要删除。万一删除了也可以到`/etc/hysteria/config.yaml`查看。

### （4）启动Hysteria2

```bash
systemctl start hysteria-server.service
```

查看Hysteria2运行状态。

```bash
systemctl status hysteria-server.service
```

如果显示：`{"error": "invalid config: tls: open /etc/hysteria/server.crt: permission denied"}`或者`failed to load server conf`的错误，则说明 Hysteria 没有访问证书文件的权限，需要执行下面的命令将 Hysteria 切换到 root 用户运行。

```bash
sed -i '/User=/d' /etc/systemd/system/hysteria-server.service sed -i '/User=/d' /etc/systemd/system/hysteria-server@.service systemctl daemon-reload systemctl restart hysteria-server.service
```

再次查看Hysteria2状态，显示active，表示已经成功启动，但并不一定可以使用了。

查看最下面的日志，如果还没有显示`serve up and running`，可能是因为在申请证书，大家需要等待一下；如果成功显示，则表示服务端已配置完成。如果等待一段时间后，出现了错误提示，并且再次查看状态显示hy已经退出，这种情况大概率是因为申请证书需要用到tcp的80和443端口，而vps的防火墙没有开放端口导致的。如果你的服务器没有什么敏感服务，可以直接关闭防火墙，或者自行搜索怎么放行指定端口。

此时需要重新执行restart指令启动服务，可以看到最后一条日志是`server up and running`，这样就成功运行了。

## 3.客户端配置

电脑端推荐使用V2rayN，安卓推荐使用NekoBox（目前已停更）、v2rayNG和sing-box，iOS可使用sing-box。

电脑端参考以下进行设置，使用CA证书的，SNI填写你的域名。

<figure>
  <img
    src="https://images.ymdr.top/file/blog/1755366187357_1729352376.png"
    alt="电脑v2rayN客户端配置"
  />
    <figcaption class="text-center">
    电脑v2rayN客户端配置
  </figcaption>
</figure>

NekoBox（目前已停更）、v2rayNG配置与电脑端类似，不过多赘述。sing-box需要修改配置文件并导入app使用，参考配置文件如下，可参考[sing-box官网](https://sing-box.sagernet.org/zh/configuration/)进行个性化修改。

```json
{
  "dns": {
    "servers": [
      {
        "tag": "cf",
        "address": "https://1.1.1.1/dns-query"
      },
      {
        "tag": "local",
        "address": "223.5.5.5",
        "detour": "direct"
      },
      {
        "tag": "block",
        "address": "rcode://success"
      }
    ],
    "rules": [
      {
        "geosite": "category-ads-all",
        "server": "block",
        "disable_cache": true
      },
      {
        "outbound": "any",
        "server": "local"
      },
      {
        "geosite": "cn",
        "server": "local"
      }
    ],
    "strategy": "ipv4_only"
  },
  "inbounds": [
    {
      "type": "tun",
      "inet4_address": "172.19.0.1/30",
      "auto_route": true,
      "strict_route": false,
      "sniff": true
    }
  ],
  "outbounds": [
    {
      "type": "hysteria2",
      "tag": "proxy",
      "server": "ip",
      "server_port": 443,
      "up_mbps": 20,
      "down_mbps": 100,
      "password": "123456",
      "tls": {
        "enabled": true,
        "server_name": "a.com",
        "insecure": false
      }
    },
    {
      "type": "direct",
      "tag": "direct"
    },
    {
      "type": "block",
      "tag": "block"
    },
    {
      "type": "dns",
      "tag": "dns-out"
    }
  ],
  "route": {
    "rules": [
      {
        "protocol": "dns",
        "outbound": "dns-out"
      },
      {
        "geosite": "cn",
        "geoip": [
          "private",
          "cn"
        ],
        "outbound": "direct"
      },
      {
        "geosite": "category-ads-all",
        "outbound": "block"
      }
    ],
    "auto_detect_interface": true
  }
}
```

更多详细配置和参数设置可参考[Hysteria2官网](https://v2.hysteria.network/zh/)或自行搜索学习。

## 脚本常用命令合集

```bash
#启动Hysteria2
systemctl start hysteria-server.service

#重启Hysteria2
systemctl restart hysteria-server.service

#查看Hysteria2状态
systemctl status hysteria-server.service

#停止Hysteria2
systemctl stop hysteria-server.service

#设置开机自启
systemctl enable hysteria-server.service

#查看日志
journalctl -u hysteria-server.service
```
