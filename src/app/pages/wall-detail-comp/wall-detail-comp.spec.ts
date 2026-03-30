import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WallDetailComp } from './wall-detail-comp';

describe('WallDetailComp', () => {
  let component: WallDetailComp;
  let fixture: ComponentFixture<WallDetailComp>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WallDetailComp],
    }).compileComponents();

    fixture = TestBed.createComponent(WallDetailComp);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
