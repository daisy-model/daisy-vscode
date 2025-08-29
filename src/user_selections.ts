import * as vscode from 'vscode';
import { NamedPath } from './util';

export async function promptUserToSelectDaisyPath(namedPaths: NamedPath[]): Promise<NamedPath | undefined> {
  const formattedOptions = namedPaths.map(option => `${option.name} (${option.path})`);
  const selected = await vscode.window.showQuickPick(formattedOptions, {
    placeHolder: 'Choose a Daisy executable to use for this run',
    canPickMany: false
  });
  if (selected) {
    return namedPaths[formattedOptions.indexOf(selected)];
  }
  return undefined;
}

export async function promptForDirectory(prompt: string): Promise<vscode.Uri | undefined> {
  const options: vscode.OpenDialogOptions = {
    canSelectFiles: false,
    canSelectFolders: true,
    canSelectMany: false,
    openLabel: prompt
  };
  const result = await vscode.window.showOpenDialog(options);
  return result?.[0]; // Return the selected folder URI, or undefined if cancelled
}

export async function promptForFile(prompt: string): Promise<vscode.Uri | undefined> {
  const options: vscode.OpenDialogOptions = {
    canSelectFiles: true,
    canSelectFolders: false,
    canSelectMany: false,
    openLabel: prompt
  };

  const result = await vscode.window.showOpenDialog(options);
  return result?.[0]; // Returns the selected file URI, or undefined if cancelled
}