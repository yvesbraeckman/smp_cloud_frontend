import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResidentsComp } from './residents-comp';

describe('ResidentsComp', () => {
  let component: ResidentsComp;
  let fixture: ComponentFixture<ResidentsComp>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResidentsComp],
    }).compileComponents();

    fixture = TestBed.createComponent(ResidentsComp);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
