/* Palette data shared by the pet and the settings window. */
(function () {
  'use strict';

  window.CAT_SKINS = [
    {
      id: 'cow',
      name: '奶牛',
      base: '#151515',
      patch: '#F8F6EF',
      patch2: '#F8F6EF',
      belly: '#F8F6EF',
      ear: '#151515',
      inner: '#151515',
      blush: '#C97C88',
      nose: '#3A3A38',
      eye: '#E2B93B',
      line: '#8B8F86',
      whisker: '#F4F4EE',
      muzzle: '#151515',
      sock: '#F8F6EF',
      pattern: 'solid'
    },
    {
      id: 'orange',
      name: '橘猫',
      base: '#E9973F',
      patch: '#C26A1F',
      patch2: '#B45E18',
      belly: '#FBE8C9',
      ear: '#E9973F',
      inner: '#D98D83',
      blush: '#E79A86',
      nose: '#7A4312',
      eye: '#5C8A3A',
      line: '#7A4312',
      whisker: '#FFFAF0',
      muzzle: '#FBE8C9',
      sock: '#FBE8C9',
      pattern: 'tabby'
    },
    {
      id: 'tabby',
      name: '狸花',
      base: '#A08A6C',
      patch: '#4D3D2B',
      patch2: '#3F3324',
      belly: '#E8D7BE',
      ear: '#A08A6C',
      inner: '#D9A79A',
      blush: '#CE938C',
      nose: '#4D3D2B',
      eye: '#8FAE4A',
      line: '#3F3324',
      whisker: '#F4F0E4',
      muzzle: '#E8D7BE',
      sock: '#A08A6C',
      pattern: 'tabby'
    },
    {
      id: 'calico',
      name: '三花',
      base: '#F8F6EF',
      patch: '#E9973F',
      patch2: '#1D1C1A',
      belly: '#F8F6EF',
      ear: '#F8F6EF',
      inner: '#F2B9B0',
      blush: '#E79A86',
      nose: '#C47F86',
      eye: '#C79A2E',
      line: '#8A8676',
      whisker: '#B5B1A2',
      muzzle: '#F8F6EF',
      sock: '#F8F6EF',
      pattern: 'calico'
    },
    {
      id: 'white',
      name: '白猫',
      base: '#F8F6EF',
      patch: '#F1E8D8',
      patch2: '#E7DCC8',
      belly: '#FFFFFF',
      ear: '#F8F6EF',
      inner: '#F2B9B0',
      blush: '#F2A0AA',
      nose: '#E88A96',
      eye: '#5AA9C9',
      line: '#8A8676',
      whisker: '#B5B1A2',
      muzzle: '#F8F6EF',
      sock: '#FFFFFF',
      pattern: 'plain'
    },
    {
      id: 'blue',
      name: '蓝灰',
      base: '#8090A0',
      patch: '#667686',
      patch2: '#5D6B7A',
      belly: '#D7E0E8',
      ear: '#8090A0',
      inner: '#C59AA0',
      blush: '#D99AA7',
      nose: '#3C4650',
      eye: '#E0A63A',
      line: '#3C4650',
      whisker: '#F4F4EE',
      muzzle: '#D7E0E8',
      sock: '#8090A0',
      pattern: 'plain'
    },
    {
      id: 'ragdoll',
      name: '布偶',
      base: '#F7F3EA',
      patch: '#FFFFFF',
      patch2: '#E6DBCE',
      belly: '#FFFFFF',
      ear: '#7D6C5F',
      tail: '#9A8B82',
      inner: '#9A8B82',
      blush: '#E7A5AD',
      nose: '#D9A5A5',
      eye: '#6FA9CF',
      line: '#A99C92',
      whisker: '#FFFDF8',
      muzzle: '#FFFFFF',
      sock: '#FFFFFF',
      pattern: 'ragdoll'
    },
    {
      id: 'siamese',
      name: '暹罗',
      base: '#F5E8CE',
      patch: '#FBF4E6',
      patch2: '#7B4F34',
      belly: '#FBF4E6',
      ear: '#6B432C',
      tail: '#7B4F34',
      inner: '#6B432C',
      blush: '#E6A0A6',
      nose: '#2A211B',
      eye: '#4F7F9E',
      line: '#5A3A26',
      whisker: '#3A2A1F',
      muzzle: '#FBF4E6',
      sock: '#7B4F34',
      pattern: 'siamese'
    },
    {
      id: 'maine',
      name: '缅因',
      base: '#CFCCC4',
      patch: '#F4F1E7',
      patch2: '#71746F',
      belly: '#F4F1E7',
      ear: '#7C7E78',
      tail: '#A8A8A0',
      inner: '#7C7E78',
      blush: '#D59A96',
      nose: '#3A2F26',
      eye: '#C79A3A',
      line: '#3A3832',
      whisker: '#FFFDF8',
      muzzle: '#F4F1E7',
      sock: '#F4F1E7',
      pattern: 'maine'
    }
  ];

  window.KEYBOARD_SKINS = [
    {
      id: 'cream',
      name: '奶油',
      shell: '#22231F',
      plate: '#34342D',
      key: '#FFFDF4',
      mod: '#E3DFCE',
      accent: '#EF7D2D',
      text: '#2A2A25',
      glow: '#FFB15C'
    },
    {
      id: 'mint',
      name: '薄荷',
      shell: '#23302B',
      plate: '#2F4139',
      key: '#EAF7EF',
      mod: '#CBE7D6',
      accent: '#57B894',
      text: '#23302B',
      glow: '#8FE3C0'
    },
    {
      id: 'lilac',
      name: '丁香',
      shell: '#2E2838',
      plate: '#3B3349',
      key: '#F3EDFF',
      mod: '#DCCFF2',
      accent: '#9B7BD4',
      text: '#2E2838',
      glow: '#C9B2FF'
    },
    {
      id: 'peach',
      name: '蜜桃',
      shell: '#3A2A26',
      plate: '#4A3530',
      key: '#FFF1E8',
      mod: '#F5D3C2',
      accent: '#F08A5D',
      text: '#3A2A26',
      glow: '#FFB48F'
    },
    {
      id: 'sky',
      name: '晴空',
      shell: '#23303A',
      plate: '#2D4050',
      key: '#EAF6FF',
      mod: '#C9E2F2',
      accent: '#4FA3D9',
      text: '#23303A',
      glow: '#8FD0FF'
    },
    {
      id: 'charcoal',
      name: '炭黑',
      shell: '#141416',
      plate: '#202024',
      key: '#3A3A40',
      mod: '#2A2A2F',
      accent: '#FFB15C',
      text: '#F5F1E6',
      glow: '#FFC46B'
    }
  ];

  window.getCatSkin = function (id) {
    return window.CAT_SKINS.find(function (s) { return s.id === id; }) || window.CAT_SKINS[0];
  };
  window.getKeyboardSkin = function (id) {
    return window.KEYBOARD_SKINS.find(function (s) { return s.id === id; }) || window.KEYBOARD_SKINS[0];
  };
})();
