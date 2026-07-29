' Runs the server hidden in the background at Windows logon/boot.
' Register this file as the Task Scheduler action's "Start a program" target.
Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)

Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = scriptDir
WshShell.Run """" & scriptDir & "\run_windows.bat"" auto", 0, False
