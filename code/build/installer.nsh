; NSIS 安装程序自定义脚本
; 用于 zgf 的命令行辅助小工具

!macro customWelcomePage
  ; 自定义欢迎页面文字
!macroend

!macro customInstall
  ; 安装完成后创建数据目录
  CreateDirectory "$INSTDIR"
!macroend

!macro customUnInstall
  ; 卸载时询问是否保留数据
  MessageBox MB_YESNO|MB_ICONQUESTION "是否保留用户数据（data.db）？选择「是」保留数据，选择「否」删除所有数据。" IDYES keep_data IDNO remove_data

  remove_data:
    Delete "$INSTDIR\data.db"
    Delete "$INSTDIR\app.log"
    RMDir "$INSTDIR"
    Goto done

  keep_data:
    ; 保留数据，只删除程序文件
    done:
!macroend
