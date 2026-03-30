import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SettingsComp } from './settings-comp';

describe('SettingsComp', () => {
  let component: SettingsComp;
  let fixture: ComponentFixture<SettingsComp>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettingsComp],
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsComp);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
