import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MyProjectsPage } from './my-projects.page';

describe('MyProjectsPage', () => {
  let component: MyProjectsPage;
  let fixture: ComponentFixture<MyProjectsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(MyProjectsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
