import * as vscode from 'vscode';
import { directoryExists } from './util';

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

function escapeArg(arg: string): string {
  const shellPath = vscode.env.shell;
  const shell = shellPath.toLowerCase();
  let escape = escapeBashArg; // Default to Bash
  if (shell.includes('powershell')) {
    escape = escapePowerShellArg;
  } else if (shell.includes('cmd.exe')) {
    escape = escapeCmdArg;
  }
  return escape(arg);
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
  const escapedCommand = escape(command);
  return `${envPrefix}${escapedCommand} ${escapedParams}`;
}

/**
 * Runs the command in a terminal with an environment variable
 */
export function runCommandWithEnv(
  command: string,
  workingDirectory: string,
  params: string[],
  envVarName: string,
  envVarValue: string,
  terminalName = 'Daisy'
) {
  const shellPath = vscode.env.shell;
  const fullCommand = buildCommandWithEnv(command, params, envVarName, envVarValue, shellPath);

  const terminal = getOrCreateTerminal(terminalName);
  terminal.show();
  if (directoryExists(workingDirectory)) {
    terminal.sendText(`cd ${escapeArg(workingDirectory)}`); // Change directory if valid
  }
  terminal.sendText(fullCommand);
}