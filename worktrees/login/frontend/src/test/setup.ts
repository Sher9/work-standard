import { config } from '@vue/test-utils'
import ElementPlus from 'element-plus'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

config.global.plugins = [ElementPlus]

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  config.global.components[key] = component
}