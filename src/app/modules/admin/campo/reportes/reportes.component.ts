import { Component, OnInit } from '@angular/core';
import { MessageService } from 'primeng/api';
import { BaseComponent } from 'src/app/shared/base/base.component';

@Component({
  selector: 'app-reportes-campo',
  templateUrl: './reportes.component.html',
  styleUrls: ['./reportes.component.css']
})
export class ReportesCampoComponent extends BaseComponent implements OnInit {

  constructor(
    protected override messageService: MessageService
  ) {
    super(messageService);
  }

  ngOnInit() {
  }
}