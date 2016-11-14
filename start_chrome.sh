#!/bin/sh

/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome -enable-logging=stderr --v=1 --vmodule=*libjingle/*=3,*=0,--vmodule=*source*/talk/*=3, --user-data-dir=/Users/eddiexue/Tencent/Projects/rtclab/node.js.test/SimpleWebrtc/chrome            

#x -psn_0_188462 --flag-switches-begin  --flag-switches-end 
#a) --vmodule=*source*/talk/*=3
#b)  --vmodule=*third_party/libjingle/*=3
#c)  --vmodule=*libjingle/source/talk/*=3