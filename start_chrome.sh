#!/bin/sh

/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome -psn_0_188462 --flag-switches-begin  --flag-switches-end -enable-logging --v=1 --vmodule=*/webrtc/*=2,*/libjingle/*=2,*=-2,*source*/talk/*=1,*third_party/libjingle/*=3,*libjingle/source/talk/*=3 --user-data-dir=/Users/eddiexue/Tencent/Projects/rtclab/node.js.test/SimpleWebrtc/chrome            

#a) --vmodule=*source*/talk/*=3
#b)  --vmodule=*third_party/libjingle/*=3
#c)  --vmodule=*libjingle/source/talk/*=3