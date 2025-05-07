export enum StatusCode {
  SUCCESS = 0,
  MAX_ARROW_ERROR = 255,
}

export function IsArrowBuffer(status: StatusCode): boolean {
  return (status <= StatusCode.MAX_ARROW_ERROR);
}
