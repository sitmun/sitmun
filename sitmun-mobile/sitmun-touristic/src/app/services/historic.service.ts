import { Injectable } from '@angular/core';
import { AuthorizationService } from './authorization.service';

@Injectable({
  providedIn: 'root'
})
export class HistoricService {

  private historic: { url: string; state: any, lang: string }[] = [];

  constructor(private authorizationService: AuthorizationService) { }

  push(url: string, state: any, lang: string) {
    this.historic.push({ url, state, lang });
    console.log('Historial creado');
  }

  async pop(lang: string): Promise<{ url: string; state: any } | null> {
    this.historic.pop(); // quitar el actual
    console.log('Historial obtenido');
    const previous = this.historic.length > 0 ? this.historic[this.historic.length - 1] : null;
    if (previous && previous.lang !== lang) {
      const data = await this.authorizationService.getPagesNodesBD(previous.state.rootNode.id);
      data['parentData'] = previous.state.parentData;
      previous.state = data;
      previous.lang = lang;
      this.updateLast(previous);
    }
    return previous;
  }

  updateLast(register: { url: string; state: any, lang: string }) {
    if (this.historic.length > 0) {
      this.historic[this.historic.length - 1] = register;
      console.log('Historial actualizado');
    } else {
      console.error('No hay historial para actualizar');
    }

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
