import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LogsComp } from './logs-comp';

describe('LogsComp', () => {
  let component: LogsComp;
  let fixture: ComponentFixture<LogsComp>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LogsComp],
    }).compileComponents();

    fixture = TestBed.createComponent(LogsComp);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
