require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'expo-module.config.json')))

Pod::Spec.new do |s|
  s.name           = 'ProximitySensor'
  s.version        = '1.0.0'
  s.summary        = 'Native proximity sensor module for Expo'
  s.description    = 'Provides access to the device proximity sensor for sujood detection'
  s.author         = 'Rooh Al-Muslim'
  s.homepage       = 'https://github.com/rooh-almuslim'
  s.platforms      = { :ios => '13.4' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
