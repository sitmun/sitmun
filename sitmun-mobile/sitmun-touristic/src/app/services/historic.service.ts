import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class HistoricService {

  private historic: { url: string; state: any }[] = [];

  constructor() { }

  push(url: string, state: any) {
    this.historic.push({ url, state });
    console.log('Historial creado');
  }

  pop(): { url: string; state: any } | null {
    this.historic.pop(); // quitar el actual
    console.log('Historial obtenido');
    return this.historic.length > 0 ? this.historic[this.historic.length - 1] : null;
  }

  clear() {
    this.historic = [];
  }

  get length(): number {
    return this.historic.length;
  }

  get stack(): { url: string; state: any }[] {
    return [...this.historic];
  }
}
