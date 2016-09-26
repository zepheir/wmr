# 水表数据采集程序(wmr)

--
#### 版本: v0.0.1

基本可以使用;

--
内部包含2大部分:

1. arm_srv
2. srv


### arm_srv:
--
用于基于arm的嵌入式linux系统, 包含一个client和一个server.

**server**: (port:8107)数据服务器, 提供json格式数据读取; (port:8108)也接受client发送过来的实时数据;

**client**: 通过gprs模块采集云端的数据, 并送至本地server端;

注意: client不是循环读取方式, 采用crontab任务安排, 5分钟读取一次;
