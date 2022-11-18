import * as vscode from 'vscode';
import { getDeviceWithServices, isLoggedIn, useBalenaClient } from '@/balena';
import { showLoginOptions } from '@/views/Authentication';
import { SelectedFleet$, showSelectFleet } from '@/views/StatusBar';
import { showInfoMsg, showWarnMsg } from '@/views/Notifications';
import { ViewId as DeviceInspectorViewIds, SelectedDevice$, showSelectDeviceInput } from '@/views/DeviceInspector';
import { ViewId as FleetExplorerViewIds } from '@/views/FleetExplorer';
import { DEVICE_LOG_URI_SCHEME, DeviceItem, DeviceStatus, ReleaseItem } from '@/providers';
import { createBalenaSSHTerminal } from './views/Terminal';
import { KeyValueItem } from './providers/sharedItems';

export enum CommandId {
  LoginToBalenaCloud = 'balena-vscode.loginToBalenaCloud',
  SelectActiveFleet = 'balena-vscode.selectActiveFleet',
  InspectDevice = 'balena-vscode.inspectDevice',
  OpenSSHConnectionInTerminal = 'balena-vscode.openSSHConnectionInTerminal',
  CopyItemToClipboard = 'balena-vscode.copyItemToClipboard',
  CopyItemKeyToClipboard = 'balena-vscode.copyItemKeyToClipboard',
  CopyItemValueToClipboard = 'balena-vscode.copyItemValueToClipboard',
  CopyNameToClipboard = 'balena-vscode.copyNameToClipboard',
  CopyUUIDToClipboard = 'balena-vscode.copyUUIDToClipboard',
  OpenLogsInNewTab = 'balena-vscode.openLogsInNewTab',
  RefreshFleet = 'balena-vscode.refreshFleet'
}

export const registerCommands = (context: vscode.ExtensionContext) => {
  context.subscriptions.push(vscode.commands.registerCommand(CommandId.LoginToBalenaCloud, loginToBalenaCloud));
  context.subscriptions.push(vscode.commands.registerCommand(CommandId.SelectActiveFleet, selectActiveFleet));
  context.subscriptions.push(vscode.commands.registerCommand(CommandId.InspectDevice, inspectDevice));
  context.subscriptions.push(vscode.commands.registerCommand(CommandId.OpenSSHConnectionInTerminal, openSSHConnectionInTerminal));
  context.subscriptions.push(vscode.commands.registerCommand(CommandId.CopyItemToClipboard, copyItemToClipboard));
  context.subscriptions.push(vscode.commands.registerCommand(CommandId.CopyItemKeyToClipboard, copyItemKeyToClipboard));
  context.subscriptions.push(vscode.commands.registerCommand(CommandId.CopyItemValueToClipboard, copyItemValueToClipboard));
  context.subscriptions.push(vscode.commands.registerCommand(CommandId.CopyNameToClipboard, copyNameToClipboard));
  context.subscriptions.push(vscode.commands.registerCommand(CommandId.CopyUUIDToClipboard, copyUUIDToClipboard));
  context.subscriptions.push(vscode.commands.registerCommand(CommandId.OpenLogsInNewTab, openLogsInNewTab));
  context.subscriptions.push(vscode.commands.registerCommand(CommandId.RefreshFleet, refreshFleet));
};

export const loginToBalenaCloud = async () => {
  const balena = useBalenaClient();
  if (await isLoggedIn(balena)) {
    showInfoMsg('Successfully Logged In!');
  } else {
    await showLoginOptions();
  }
};

export const selectActiveFleet = async () => {
  await showSelectFleet();
  focusFleetExplorer();
};

export const inspectDevice = async (device?: DeviceItem) => {
  const balena = useBalenaClient();
  if (device) {
    const deviceWithServices = await getDeviceWithServices(balena, device.uuid) ?? undefined;
    SelectedDevice$.next(deviceWithServices);
    focusDeviceInspector();
  }
  else {
    const selectedDevice = await showSelectDeviceInput();
    if (selectedDevice) {
      const device = await getDeviceWithServices(balena, selectedDevice.uuid) ?? undefined;
      SelectedDevice$.next(device);
      focusDeviceInspector();
    }
  }
};

export const openSSHConnectionInTerminal = async (device?: DeviceItem) => {
  let deviceName: string | undefined;
  let deviceUUID: string | undefined;

  if (device) {
    deviceName = device.label;
    deviceUUID = device.uuid;
  } else {
    const selectedDevice = await showSelectDeviceInput();
    deviceName = selectedDevice?.device_name;
    deviceUUID = selectedDevice?.uuid;
  }

  if (device?.status === DeviceStatus.Offline || device?.status === DeviceStatus.OnlineHeartbeatOnly) {
    showWarnMsg("Device is currently offline or has limited connectivity. Cannot create terminal session.");
  } else if (!deviceName || !deviceUUID) {
    showWarnMsg('Device name or uuid is undefined. Cannot create terminal session.');
  } else {
    createBalenaSSHTerminal(deviceName, deviceUUID);
  }
};

export const focusDeviceInspector = () => vscode.commands.executeCommand(`${DeviceInspectorViewIds.Summary}.focus`);
export const focusFleetExplorer = () => vscode.commands.executeCommand(`${FleetExplorerViewIds.Devices}.focus`);

export const copyItemToClipboard = async (item: vscode.TreeItem) => await copyToClipboard(item.label as string);
export const copyItemKeyToClipboard = async (item: KeyValueItem) => await  copyToClipboard(item.key);
export const copyItemValueToClipboard = async (item: KeyValueItem) => await copyToClipboard(item.value);
export const copyNameToClipboard = async (item: DeviceItem | ReleaseItem) => await copyToClipboard(item.name);
export const copyUUIDToClipboard = async (item: DeviceItem | ReleaseItem) => await copyToClipboard(item.uuid);
const copyToClipboard = async (value: string) => {
  showInfoMsg(`Clipboard copied: ${value}`);
  await vscode.env.clipboard.writeText(value.toString());
};

export const openLogsInNewTab = async (device: DeviceItem) => {
  const uri = vscode.Uri.parse(DEVICE_LOG_URI_SCHEME.concat(':', device.name, '#', device.uuid));
  await vscode.window.showTextDocument(uri, { preview: true });
};

export const refreshFleet = () => {
  let fleet;
  SelectedFleet$.subscribe(f => fleet = f).unsubscribe();
  SelectedFleet$.next(fleet);
};