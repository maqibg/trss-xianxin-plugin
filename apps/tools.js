import plugin from "../../../lib/plugins/plugin.js";
import fetch from "node-fetch";
import fs from "node:fs";
import xxCfg from "../model/xxCfg.js";

import { Restart } from "../../other/restart.js";

const _path = process.cwd();

const cacheDirs = [
  {
    name: "data/",
    path: `${_path}/data/`,
    clearReg: /^[a-z0-9]{32}$/,
  },
  {
    name: "data/image/",
    path: `${_path}/data/image/`,
    clearReg: /^[a-z0-9]{32}$/,
  },
];

export class tools extends plugin {
  constructor() {
    super({
      name: "闲心小工具",
      dsc: "处理一些杂项小工具",
      event: "message",
      priority: 5000,
      rule: [
        {
          reg: "^#*大地图\\s*.*$",
          fnc: "map",
        },
        {
          reg: "^#*清理缓存文件$",
          fnc: "clearCache",
          permission: "master",
        },
        {
          reg: "^#*清理无效数据$",
          fnc: "clearInvalidData",
          permission: "master",
        },
      ],
    });

    this.pkJsonPath = "./data/pkJson/";
  }

  

  async map() {
    let keyword = this.e.msg.replace(/#*大地图\s*/g, "").trim() || "传送点";

    const headers = {
      Referer: "https://bbs.mihoyo.com/",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36",
    };

    const fetchData = await fetch(
      `https://waf-api-takumi.mihoyo.com/common/map_user/ys_obc/v1/map/label/tree?map_id=2&app_sn=ys_obc&lang=zh-cn`,
      { method: "get", headers }
    );

    const resJsonData = await fetchData.json();

    if (resJsonData.retcode != 0 && resJsonData.data.tree) {
      this.e.reply("接口异常，请稍后重试");
      return;
    }

    const list = resJsonData.data.tree;

    let id = 0;
    let fuzzId = 0;

    let fuzzName = "";

    list.map((item) => {
      if (id != 0) {
        return item;
      }
      if (item.name == keyword) {
        id = item.id;
      }
      if (item.name.indexOf(keyword) !== -1) {
        fuzzId = item.id;
        fuzzName = item.name;
      }
      if (item.children && item.children.length && id == 0) {
        item.children.map((subItem) => {
          if (id != 0) {
            return subItem;
          }
          if (subItem.name == keyword) {
            id = subItem.id;
          }
          if (subItem.name.indexOf(keyword) !== -1) {
            fuzzId = subItem.id;
            fuzzName = subItem.name;
          }
        });
      }
    });

    if (id == 0 && fuzzId == 0) {
      this.e.reply(`未找到${keyword}，可以换一个词试试`);
      return;
    }

    this.e.reply(
      `${
        fuzzName || keyword
      }大地图分布链接：\nhttps://webstatic.mihoyo.com/ys/app/interactive-map/index.html?lang=zh-cn#/map/2?zoom=-1.00&default_shown=${
        id || fuzzId
      }&hidden-ui=true`
    );
  }

  async clearCache() {
    let dataCount = 0;

    cacheDirs.forEach(async (dirItem, dirIndex) => {
      const cachefiles = fs.readdirSync(dirItem.path);
      await this.e.reply(`开始清理${dirItem.name}缓存文件...`);

      await cachefiles.forEach(async (file) => {
        if (new RegExp(dirItem.clearReg).test(file)) {
          fs.unlinkSync(dirItem.path + file);
          dataCount++;
        }
      });

      if (dirIndex == cacheDirs.length - 1) {
        await this.e.reply(`清理完成，共清理缓存文件：${dataCount}个`);
      }
    });
  }

  async clearInvalidData() {
    /** 有效群数据 */
    const validGroupList = Array.from(Bot.gl.keys());

    /** 群有效用户数据 */
    const gfl = {};
    let pkArr = {};

    for (let index = 0; index < validGroupList.length; index++) {
      let gflMap = await Bot.pickGroup(
        Number(validGroupList[index])
      ).getMemberMap();
      gfl[validGroupList[index]] = Array.from(gflMap.keys());

      let path = `${this.pkJsonPath}${validGroupList[index]}.json`;
      if (fs.existsSync(path)) {
        pkArr[validGroupList[index]] = new Map();
        let pkMapJson = JSON.parse(fs.readFileSync(path, "utf8"));
        for (let key in pkMapJson) {
          pkArr[validGroupList[index]].set(String(key), pkMapJson[key]);
        }
      }
    }

    if (validGroupList.length) {
      await this.e.reply("清理群战中无效成员信息");

      for (let index = 0; index < validGroupList.length; index++) {
        const pkUserIds = Array.from(pkArr[validGroupList[index]].keys());
        for (let pkindex = 0; pkindex < pkUserIds.length; pkindex++) {
          if (
            !gfl[validGroupList[index]].includes(Number(pkUserIds[pkindex]))
          ) {
            pkArr[validGroupList[index]].delete(String(pkUserIds[pkindex]));
          }
        }
        this.saveJson(pkArr, validGroupList[index]);
      }
    }
    await this.e.reply("已清理完成，正在启动重启操作以使数据生效");
    setTimeout(() => this.restart(), 2000);
  }

  /**
   * 云崽重启操作
   */
  restart() {
    new Restart(this.e).restart();
  }

  

  /** 保存json文件 */
  saveJson(pkArr, group_id) {
    let obj = {};
    for (let [k, v] of pkArr[group_id]) {
      obj[k] = v;
    }

    fs.writeFileSync(
      `${this.pkJsonPath}${group_id}.json`,
      JSON.stringify(obj, "", "\t")
    );
  }
}
