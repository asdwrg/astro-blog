---
title: Hysteria2搭建教程
author: ymdr
pubDatetime: 2024-10-19
modDatetime: 2025-08-09
slug: Hysteria2-Tutorial
featured: false
draft: true
tags:
  - 教程
  - 协议
description:
  Hysteria2通过魔改的 QUIC 协议，可以极大地改善网络不稳定和掉包的情况。但流量大时易被误认为DDoS攻击从而遭到拦截。此协议对移动用户而言体验不佳。
---

<!-- omit from toc -->
## 目录

Hysteria2通过魔改的 QUIC 协议，可以极大地改善网络不稳定和掉包的情况。但流量大时易被误认为DDoS攻击从而遭到拦截。此协议对移动用户而言体验不佳。适合对丢包要求不高的场景，比如游戏加速。

## 1.准备

首先，你需要拥有一台vps，并确保防火墙已设置妥当（能正常访问互联网，并开启端口）。

## 2.服务端搭建
