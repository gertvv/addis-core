'use strict';
define(['angular', 'angular-mocks'], function() {
  describe('the duration service', function() {
    var subsetSelectService;

    beforeEach(module('trialverse.util'));

    beforeEach(inject(function(SubsetSelectService) {
      subsetSelectService = SubsetSelectService;
    }));

    describe('addOrRemoveItem', function() {
      var item1 = {
          uri: 'item 1'
        },
        item2 = {
          uri: 'item 2'
        },
        item3 = {
          uri: 'item 3'
        },
        items = [
          item1, item2
        ];
      describe('when newValue is truthy', function() {
        it('should add newValue to the list of selected items', function() {
          expect(subsetSelectService.addOrRemoveItem(true, item3, items)).toEqual(items.concat(item3));
        });
      });
      describe('when newValue is falsy', function() {
        it('should remove oldValue from the list of selected items', function() {
          expect(subsetSelectService.addOrRemoveItem(false, item2, items)).toEqual([item1]);
        });
      });
    });

    describe('createSelectionList', function() {
      describe('for an empty target', function() {
        it('should return an all-false list', function() {
          expect(subsetSelectService.createSelectionList(['item 1', 'item 2'], [])).toEqual([false, false]);
        });
      });
      describe('for a non-empty target list', function() {
        it('should return a list with false for items not in the target, and true for items that are in the target', function() {
          var source = [{
            uri: 'item 1'
          }, {
            uri: 'item 2'
          }, {
            uri: 'item 3'
          }];
          expect(subsetSelectService.createSelectionList(source, [{uri: 'item 2'}])).toEqual([false, true, false]);
        });
      });
    });
  });
});