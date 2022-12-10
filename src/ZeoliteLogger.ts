/**
 * @deprecated use log4js instead
 */
export class ZeoliteLogger {
  private level: LoggerLevel;
  public name: string;

  public constructor(level: LoggerLevel, name: string) {
    this.level = level;
    this.name = name;
  }

  public setLogLevel(level: LoggerLevel) {
    this.level = level;
  }

  public debug(msg: string) {
    if (this.level > LoggerLevel.Debug) return;
    console.log(`\x1b[34m[DEBUG: ${this.name}]\x1b[0m ${msg}`);
  }

  public info(msg: string) {
    if (this.level > LoggerLevel.Info) return;
    console.log(`\x1b[32m[INFO: ${this.name}]\x1b[0m ${msg}`);
  }

  public warn(msg: string) {
    if (this.level > LoggerLevel.Warn) return;
    console.log(`\x1b[33m[WARNING: ${this.name}]\x1b[0m ${msg}`);
  }

  public error(msg: string) {
    if (this.level > LoggerLevel.Error) return;
    console.log(`\x1b[31m[ERROR: ${this.name}]\x1b[0m ${msg}`);
  }
}

export enum LoggerLevel {
  Debug,
  Info,
  Warn,
  Error,
}
