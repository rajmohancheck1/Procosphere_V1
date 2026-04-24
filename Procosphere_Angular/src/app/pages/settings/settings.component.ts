import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html',
})
export class SettingsComponent {
  savedMessage = '';

  settings = {
    emailNotifications: true,
    orderUpdates: true,
    lowStockAlerts: true,
    deliveryAlerts: true,
    weeklyReports: false,
    twoFactorAuth: false,
    sessionTimeout: '30',
    theme: 'light',
    language: 'en',
    emailFrequency: 'instant',
  };

  themes = ['light', 'dark', 'auto'];

  emailFrequencies = [
    { value: 'instant', label: 'Instant', desc: 'Get emails immediately' },
    { value: 'daily',   label: 'Daily Digest', desc: 'Once per day summary' },
    { value: 'weekly',  label: 'Weekly Digest', desc: 'Once per week summary' },
  ];

  handleSave() {
    this.savedMessage = 'Settings saved successfully!';
    setTimeout(() => (this.savedMessage = ''), 3000);
  }

  handleReset() {
    if (confirm('Reset all settings to default values?')) {
      this.settings = {
        emailNotifications: true,
        orderUpdates: true,
        lowStockAlerts: true,
        deliveryAlerts: true,
        weeklyReports: false,
        twoFactorAuth: false,
        sessionTimeout: '30',
        theme: 'light',
        language: 'en',
        emailFrequency: 'instant',
      };
      this.savedMessage = 'Settings have been reset';
      setTimeout(() => (this.savedMessage = ''), 3000);
    }
  }
}
