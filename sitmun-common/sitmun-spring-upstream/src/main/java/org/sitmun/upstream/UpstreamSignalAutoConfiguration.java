package org.sitmun.upstream;

import org.sitmun.upstream.signal.ServiceCheckClassifier;
import org.sitmun.upstream.signal.capture.AuthFailedCapture;
import org.sitmun.upstream.signal.capture.ClientErrorCapture;
import org.sitmun.upstream.signal.capture.ConnectCapture;
import org.sitmun.upstream.signal.capture.InterruptedReadCapture;
import org.sitmun.upstream.signal.capture.OgcExceptionCapture;
import org.sitmun.upstream.signal.capture.OtherTransportCapture;
import org.sitmun.upstream.signal.capture.ProtocolSuccessCapture;
import org.sitmun.upstream.signal.capture.ServerErrorCapture;
import org.sitmun.upstream.signal.capture.SocketTimeoutCapture;
import org.sitmun.upstream.signal.capture.TlsCapture;
import org.sitmun.upstream.signal.capture.UnknownHostCapture;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.context.annotation.Import;

@AutoConfiguration
@Import({
  SocketTimeoutCapture.class,
  InterruptedReadCapture.class,
  UnknownHostCapture.class,
  ConnectCapture.class,
  TlsCapture.class,
  AuthFailedCapture.class,
  ProtocolSuccessCapture.class,
  ClientErrorCapture.class,
  ServerErrorCapture.class,
  OgcExceptionCapture.class,
  OtherTransportCapture.class,
  ServiceCheckClassifier.class
})
public class UpstreamSignalAutoConfiguration {}
