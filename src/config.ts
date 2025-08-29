import * as vscode from 'vscode';
import * as util from './util';
import * as user from './user_selections';

export async function getDaisyConfig() : Promise<{home:string, executable: string} | undefined> {
	const workspaceConfig = vscode.workspace.getConfiguration('Daisy');
  	const config = {
		"home" : util.toStringSafe(workspaceConfig.get("home")),
		"executable" : ""
	};
  // Check or get Daisy home
  if (!util.directoryExists(config["home"])) {
		const folderUri = await user.promptForDirectory("Select Daisy home folder");
		if (folderUri) {
			config["home"] = folderUri.fsPath;
			workspaceConfig.update("home", config["home"], vscode.ConfigurationTarget.Workspace);
		} else {
			vscode.window.showErrorMessage("Missing Daisy home");
			return undefined;
		}
	}

  // Check or get Daisy path
  const exePaths = util.toNamedPathSafe(workspaceConfig.get("executable"));
  if (exePaths.length === 0) {
    // We have no path in config so we ask user for one
    const fileUri = await user.promptForFile("Select Daisy executable");
		if (fileUri) {
			config["executable"] = fileUri.fsPath;
			workspaceConfig.update(
        "executable",
        [{"name": "default", "path": config["executable"]}],
        vscode.ConfigurationTarget.Workspace
      );
    } else {
      // No path selected by user, so we give up
      vscode.window.showErrorMessage("No Daisy executable selected");
      return undefined;
    }    
  } else if (exePaths.length === 1) {
    // There is exactly one path in config, so we just check that it exists
    const path = exePaths[0].path;
    const name = exePaths[0].name;
    if (util.fileExists(path)) {
      vscode.window.showInformationMessage(`Using daisy executable ${name} at ${path}`);
      config["executable"] = path;
    } else {
      vscode.window.showErrorMessage(`Daisy executable ${name} at ${path} does not exist`);
      return undefined;
    }

  } else if (exePaths.length > 1) {
    // There are many paths in config, so we ask the user to select one
    const selected = await user.promptUserToSelectDaisyPath(exePaths);
    if (selected) {
        const path = selected.path;
        const name = selected.name;
        if (util.fileExists(path)) {
            vscode.window.showInformationMessage(`Using daisy executable ${name} at ${path}`);
            config["executable"] = path;
        } else {
            vscode.window.showErrorMessage(`Daisy executable ${name} at ${path} does not exist`);
            return undefined;
        }
    } else {
      vscode.window.showErrorMessage(`No Daisy executable selected`);
      return undefined;
    }
  }
  return config;
}