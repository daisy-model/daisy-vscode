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

function escapeCommand(command: string): string {
  const shellPath = vscode.env.shell;
  const shell = shellPath.toLowerCase();
  if (shell.includes('powershell')) {
    // PS does not like a quoted path, instead we quote each part except the drive letter...
    return command.split(/[/\\]/).map((value: string, index: number, array: string[]) => {
      return index === 0 ? value : escapePowerShellArg(value);
    }).join("/");
  } else if (shell.includes('cmd.exe')) {
    // cmd.exe is happy to run a quoted path
    return escapeCmdArg(command);
  }
  // Bash is also happy with a quoted path
  return escapeBashArg(command);
}

function getShellName(): string {
  const shellPath = vscode.env.shell;
  const shell = shellPath.toLowerCase();
  if (shell.includes('powershell')) {
    return 'powershell';
  } else if (shell.includes('cmd.exe')) {
    return 'cmd';
  }
  return 'bash';
}

/**
 * Builds a shell-specific command with environment variable
 */
function buildCommandWithEnv(
  command: string,
  params: string[],
  envVarName: string,
  envVarValue: string,
  shell: string
): string {
  let escape: (arg: string) => string;
  let envPrefix: string;

  if (shell === 'powershell') {
    escape = escapePowerShellArg;
    envPrefix = `$env:${envVarName} = ${escape(envVarValue)}; `;
  } else if (shell === 'cmd') {
    escape = escapeCmdArg;
    envPrefix = `set ${envVarName}=${envVarValue}&&`;
  } else {
    // Default to Bash
    escape = escapeBashArg;
    envPrefix = `${envVarName}=${escape(envVarValue)} `;
  }

  const escapedParams = params.map(escape).join(' ');
  // We need to escape the command as well, but it is not the same way as for an argument
  const escapedCommand = escapeCommand(command);
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
  const shell = getShellName();

  const fullCommand = buildCommandWithEnv(command, params, envVarName, envVarValue, shell);

  const terminal = getOrCreateTerminal(`${terminalName} ${shell}`);
  terminal.show();
  if (directoryExists(workingDirectory)) {
    terminal.sendText(`cd ${escapeArg(workingDirectory)}`); // Change directory if valid
  }
  terminal.sendText(fullCommand);
}