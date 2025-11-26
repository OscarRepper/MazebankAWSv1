import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { HttpClient, HttpClientModule, HttpClientXsrfModule } from '@angular/common/http';
import { Tarjetas } from '../tarjetas/tarjetas';
import { routes } from '../app.routes';

@Component({
  selector: 'app-servicio',
  standalone: true,
  imports: [FormsModule, RouterModule, HttpClientModule],
  templateUrl: './servicio.html',
  styleUrls: ['./servicio.css']
})

export class Servicio {
  constructor(private router: Router, private http: HttpClient) { }

}
