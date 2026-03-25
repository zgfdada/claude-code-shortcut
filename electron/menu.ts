import { Menu } from 'electron';

// 无边框模式：禁用原生菜单栏
export function createAppMenu(): void {
  Menu.setApplicationMenu(null);
}
