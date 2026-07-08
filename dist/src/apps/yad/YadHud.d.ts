export declare class YadHud {
    private _container;
    private _healthEl;
    private _armorEl;
    private _ammoEl;
    private _faceCanvas;
    private _faceImages;
    private _keycardSlots;
    private _keycards;
    private _ammoInfoCanvas?;
    private _health;
    private _armor;
    private _ammo;
    constructor();
    private _bindEvents;
    private _updateDisplay;
    private _createSegments;
    private _createSegment;
    private _removeAntiAliasing;
    private _addMainStat;
    private _updateMainStatCanvas;
    private _armsCanvas?;
    private _createWeaponButtons;
    private _createKeycardButtons;
    private _createAmmoInfo;
    private _drawAmmoInfo;
    private _loadAndSliceFace;
}
