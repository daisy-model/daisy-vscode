import * as vscode from 'vscode';
import * as fs from 'fs';

export function getCurrentFilePath(): string | undefined {
  const editor = vscode.window.activeTextEditor;
  if (editor) {
    const fileUri = editor.document.uri;
    return fileUri.fsPath; // This gives you the full file system path
  }
  return undefined;
}

export function directoryExists(dirPath: string): boolean {
  try {
    return fs.statSync(dirPath).isDirectory();
  } catch (err) {
    return false;
  }
}

export function fileExists(filePath: string): boolean {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

export function toStringSafe(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  return "";
}

export interface NamedPath {
  name: string;
  path: string;
}

export function toNamedPathSafe(value: unknown): NamedPath[] {
  if (!Array.isArray(value)) {
    vscode.window.showWarningMessage('value is not an array.');
    return [];
  }
  const valid: NamedPath[] = value
    .filter(item => typeof item === 'object' && item !== null)
    .filter(item => typeof item.name === 'string' && typeof item.path === 'string')
    .map(item => ({ name: item.name, path: item.path }));
  return valid;
}