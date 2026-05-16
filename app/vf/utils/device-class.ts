import { getGPUTier } from 'detect-gpu'
import { store } from '../../store'
import { down, matchMediaQuery } from '../../utils/mq'
import { DEVICE_CLASS } from '../consts'

export const estimateDeviceClass = async () => {
  const { estimatedDeviceClass: initialEstimatedDeviceClass, ua } =
    store.getState()

  let estimatedDeviceClass = initialEstimatedDeviceClass

  const device = ua.getDevice()
  const isMobile = device.is('mobile')
  const isTablet = device.is('tablet')
  const isSmallScreen = matchMediaQuery(down('md')).matches
  if (isMobile) {
    estimatedDeviceClass = DEVICE_CLASS.mobile
  } else if (isSmallScreen || isTablet) {
    estimatedDeviceClass = DEVICE_CLASS.low
  } else {
    const gpuTier = await getGPUTier()
    console.log('gpuTier', gpuTier)
    switch (gpuTier.tier) {
      case 3:
        estimatedDeviceClass = DEVICE_CLASS.high
        break
      case 2:
        estimatedDeviceClass = DEVICE_CLASS.mid
        break
      default:
        estimatedDeviceClass = DEVICE_CLASS.low
    }
  }

  return estimatedDeviceClass
}
