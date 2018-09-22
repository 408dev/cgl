describe('CGL', function()
{
	describe('Set the size of field', function()
  	{
    	it('should return the array of W*H by resize()', function()
    	{
    		let cgl = new CGL();
    		cgl.resize(5,7);
    		let data = cgl.getCurrentData();
      		chai.expect(data.d.length).to.equal(35);
    	});
    	it('should return the array with zeroes by resize()', function()
    	{
    		let cgl = new CGL();
    		cgl.resize(5,7);
    		let data = cgl.getCurrentData();
      		chai.expect(data.d).to.deep.equal(Array.from({length: 35}, x => 0));
    	});
  	});

	describe('Set and get', function()
  	{
    	it('setting value 1 to a cell and getting it', function()
    	{
    		let cgl = new CGL();
    		cgl.resize(5,7);
    		cgl.setData(1,3,1);
    		let data = cgl.getData(1,3);
      		chai.expect(data).to.equal(1);
    	});
    	it('setting value 0 to a cell and getting it', function()
    	{
    		let cgl = new CGL();
    		cgl.resize(5,7);
    		cgl.setData(1,3,0);
    		let data = cgl.getData(1,3);
      		chai.expect(data).to.equal(0);
    	});
  	});

	describe('Needs resizing?', function()
  	{
    	it('setting value 1 to the edge and checking needResize()', function()
    	{
    		let cgl = new CGL();
    		cgl.resize(5,7);
    		cgl.setData(0,3,1);
    		let data = cgl.needsResize();
      		chai.expect(data).to.equal(true);
    	});
    	it('setting value 0 to the edge and checking needResize()', function()
    	{
    		let cgl = new CGL();
    		cgl.resize(5,7);
    		cgl.setData(0,3,0);
    		let data = cgl.needsResize();
      		chai.expect(data).to.equal(false);
    	});
	});

	describe('Next step', function()
  	{
    	it('setting square 2x2 - it should remain', function()
    	{
    		let cgl = new CGL();
    		cgl.resize(4,4);
    		cgl.setData(1,1,1);
    		cgl.setData(1,2,1);
    		cgl.setData(2,1,1);
    		cgl.setData(2,2,1);
    		let nrb = cgl.needsResize();
    		let before = cgl.getCurrentData();
    		cgl.nextTick();
    		let nra = cgl.needsResize();
    		let after = cgl.getCurrentData();

      		chai.expect(nrb).to.equal(nra);
      		chai.expect(nrb).to.equal(false);

      		chai.expect(before.d).to.deep.equal(after.d);
    	});
    	it('setting line 3x1 - it should rotate', function()
    	{
    		let cgl = new CGL();
    		cgl.resize(5,5);
    		cgl.setData(2,1,1);
    		cgl.setData(2,2,1);
    		cgl.setData(2,3,1);

    		let nrb = cgl.needsResize();
    		let before = cgl.getCurrentData();
    		cgl.nextTick();
    		let nra = cgl.needsResize();
    		let after = cgl.getCurrentData();

      		chai.expect(nrb).to.equal(nra);
      		chai.expect(nrb).to.equal(false);

      		let a = Array.from({length: 25}, x => 0);
      		a[11] = a[12] = a[13] = 1;
			chai.expect(after.d).to.deep.equal(a);
    	});
	});

});