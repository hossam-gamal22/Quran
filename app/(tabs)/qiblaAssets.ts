// qiblaAssets.ts
// Statically map all SVG assets for Metro bundler compatibility
export const QIBLA_STYLES = {
  style1: {
    dial: require('../../components/qibla/svg/style1/dial.svg'),
    pointer: require('../../components/qibla/svg/style1/pointer.svg'),
  },
  style2: {
    dial: require('../../components/qibla/svg/style2/dial.svg'),
    pointer: require('../../components/qibla/svg/style2/pointer.svg'),
  },
  style3: {
    dial: require('../../components/qibla/svg/style3/dial.svg'),
    pointer: require('../../components/qibla/svg/style3/pointer.svg'),
  },
  style4: {
    dial: require('../../components/qibla/svg/style4/dial.svg'),
    pointer: require('../../components/qibla/svg/style4/pointer.svg'),
  },
  style5: {
    dial: require('../../components/qibla/svg/style5/dial.svg'),
    pointer: require('../../components/qibla/svg/style5/pointer.svg'),
  },
  style6: {
    dial: require('../../components/qibla/svg/style6/dial.svg'),
    pointer: require('../../components/qibla/svg/style6/pointer.svg'),
  },
  style7: {
    dial: require('../../components/qibla/svg/style7/dial.svg'),
    pointer: require('../../components/qibla/svg/style7/pointer.svg'),
  },
  style8: {
    dial: require('../../components/qibla/svg/style8/dial.svg'),
    pointer: require('../../components/qibla/svg/style8/pointer.svg'),
  },
  style9: {
    dial: require('../../components/qibla/svg/style9/dial.svg'),
    pointer: require('../../components/qibla/svg/style9/pointer.svg'),
  },
  style10: {
    dial: require('../../components/qibla/svg/style10/dial.svg'),
    pointer: require('../../components/qibla/svg/style10/pointer.svg'),
  },
};

export const AVAILABLE_STYLES = Object.keys(QIBLA_STYLES);
