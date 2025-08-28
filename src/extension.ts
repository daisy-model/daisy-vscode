// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import { checkServerIdentity } from 'tls';

async function promptForDirectory(prompt: string): Promise<vscode.Uri | undefined> {
  const options: vscode.OpenDialogOptions = {
    canSelectFiles: false,
    canSelectFolders: true,
    canSelectMany: false,
    openLabel: prompt
  };
  const result = await vscode.window.showOpenDialog(options);
  return result?.[0]; // Return the selected folder URI, or undefined if cancelled
}

async function promptForFile(prompt: string): Promise<vscode.Uri | undefined> {
  const options: vscode.OpenDialogOptions = {
    canSelectFiles: true,
    canSelectFolders: false,
    canSelectMany: false,
    openLabel: prompt
  };

  const result = await vscode.window.showOpenDialog(options);
  return result?.[0]; // Returns the selected file URI, or undefined if cancelled
}

function directoryExists(dirPath: string): boolean {
  try {
    return fs.statSync(dirPath).isDirectory();
  } catch (err) {
    return false;
  }
}

function fileExists(filePath: string): boolean {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function toStringSafe(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  return "";
}

function getCurrentFilePath(): string | undefined {
  const editor = vscode.window.activeTextEditor;
  if (editor) {
    const fileUri = editor.document.uri;
    return fileUri.fsPath; // This gives you the full file system path
  }
  return undefined;
}

function getOrCreateTerminal(name: string): vscode.Terminal {
  const existing = vscode.window.terminals.find(t => t.name === name);
  if (existing) {
    return existing;
  }
  return vscode.window.createTerminal(name);
}

function escapeBashArg(arg: string): string {
  return `'${arg.replace(/'/g, `'\\''`)}'`;
}

function escapePowerShellArg(arg: string): string {
  return `'${arg.replace(/'/g, "''")}'`;
}

function escapeCmdArg(arg: string): string {
  return `"${arg.replace(/(["^])/g, '^$1')}"`;
}

/**
 * Builds a shell-specific command with environment variable
 */
function buildCommandWithEnv(
  command: string,
  params: string[],
  envVarName: string,
  envVarValue: string,
  shellPath: string
): string {
  const shell = shellPath.toLowerCase();

  let escape: (arg: string) => string;
  let envPrefix: string;

  if (shell.includes('powershell')) {
    escape = escapePowerShellArg;
    envPrefix = `$env:${envVarName} = ${escape(envVarValue)}; `;
  } else if (shell.includes('cmd.exe')) {
    escape = escapeCmdArg;
    envPrefix = `set ${envVarName}=${envVarValue} && `;
  } else {
    // Default to Bash
    escape = escapeBashArg;
    envPrefix = `${envVarName}=${escape(envVarValue)} `;
  }

  const escapedParams = params.map(escape).join(' ');
  return `${envPrefix}${command} ${escapedParams}`;
}

/**
 * Runs the command in a terminal with an environment variable
 */
function runCommandWithEnv(
  command: string,
  params: string[],
  envVarName: string,
  envVarValue: string,
  terminalName = 'Daisy'
) {
  const shellPath = vscode.env.shell;
  const fullCommand = buildCommandWithEnv(command, params, envVarName, envVarValue, shellPath);

  const terminal = getOrCreateTerminal(terminalName);
  terminal.show();
  terminal.sendText(fullCommand);
}

async function getDaisyConfig() : Promise<{home:string, executable: string} | undefined> {
	const workspaceConfig = vscode.workspace.getConfiguration('Daisy');
	const config = {
		"home" : toStringSafe(workspaceConfig.get("home")),
		"executable" : toStringSafe(workspaceConfig.get("executable"))
	};
	if (!directoryExists(config["home"])) {
		const folderUri = await promptForDirectory("Select Daisy home folder");
		if (folderUri) {
			config["home"] = folderUri.fsPath;
			workspaceConfig.update("home", config["home"], vscode.ConfigurationTarget.Workspace);
		} else {
			vscode.window.showErrorMessage("Missing Daisy home");
			return undefined;
		}
	}
	if (!fileExists(config["executable"])) {
		const fileUri = await promptForFile("Select Daisy executable");
		if (fileUri) {
			config["executable"] = fileUri.fsPath;
			workspaceConfig.update("executable", config["executable"], vscode.ConfigurationTarget.Workspace);
		} else {
			vscode.window.showErrorMessage("Missing Daisy executable");
			return undefined;		
		}
	}
	return config;
}

async function daisyRun() {
	const config = await getDaisyConfig();
	if (config) {
		//console.log("Daisy home: " + config["home"]);
		console.log("Daisy executable: " + config["executable"]);
		const currentFile = getCurrentFilePath();
		if (currentFile) {
			runCommandWithEnv(config["executable"], [currentFile], "DAISYHOME", config["home"]);
		} else {
			vscode.window.showErrorMessage("Unable to get path to current file");
		}
	} else {
		vscode.window.showErrorMessage("Unable to run Daisy due to missing configuration.");
	}
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "daisy" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('daisy.run', daisyRun);

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
