' Windows 로그온/부팅 시 자동으로 서버를 백그라운드(창 숨김)로 실행합니다.
' 작업 스케줄러의 "프로그램 시작" 대상으로 이 파일을 등록하세요.
Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)

Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = scriptDir
WshShell.Run """" & scriptDir & "\run_windows.bat"" auto", 0, False
