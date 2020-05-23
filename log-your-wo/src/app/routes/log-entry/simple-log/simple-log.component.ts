import { Component, OnInit } from '@angular/core';

import { FormValues } from '../../../shared/common/common.constants';

@Component({
  selector: 'app-simple-log',
  templateUrl: './simple-log.component.html',
  styleUrls: ['./simple-log.component.scss']
})
export class SimpleLogComponent implements OnInit {
  
  public contentHeadingLabel: string = FormValues.AddExerciseContentHeading;

  constructor() { }

  ngOnInit(): void {
  }

}
