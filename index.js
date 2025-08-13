import fs from "node:fs";
import xxCfg from "./model/xxCfg.js";
import chalk from 'chalk'

if (!global.segment) {
  try {
    global.segment = (await import("oicq")).segment;
  } catch (err) {
    global.segment = (await import("icqq")).segment;
  }
}

const versionData = xxCfg.getdefSet("version", "version");

logger.info(chalk.rgb(0, 190, 255)(`--------------------------`));
logger.info(chalk.rgb(255 ,225 ,255)(` 闲心插件已启动 ${versionData[0].
logger.info(chalk.rgb(0, 190, 255)(`--------------------------`));

const files = fs
  .readdirSync("./plugins/trss-xianxin-plugin/apps")
  .filter((file) => file.endsWith(".js"));

let ret = [];

files.forEach((file) => {
  ret.push(import(`./apps/${file}`));
});

ret = await Promise.allSettled(ret);

let apps = {};
for (let i in files) {
  let name = files[i].replace(".js", "");

  if (ret[i].status != "fulfilled") {
    logger.error(`载入插件错误：${logger.red(name)}`);
    logger.error(ret[i].reason);
    continue;
  }
  apps[name] = ret[i].value[Object.keys(ret[i].value)[0]];
}
export { apps };
