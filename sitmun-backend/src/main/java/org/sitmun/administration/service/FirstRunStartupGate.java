package org.sitmun.administration.service;

import org.springframework.stereotype.Component;

/** Setup endpoints answer 503 until startup has finished applying bootstrap variables. */
@Component
public class FirstRunStartupGate {

  private volatile boolean ready;

  public boolean isReady() {
    return ready;
  }

  public void open() {
    ready = true;
  }

  /** Tests close the gate again. Production opens it once. */
  public void close() {
    ready = false;
  }
}
